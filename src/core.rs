use std::fmt::{self, Formatter, Display};
use std::{ops::Try, path::{Path, PathBuf}};

#[derive(Clone, Debug)]
pub struct FilePosition {
    path: PathBuf,
    position: (usize, usize)
}

impl FilePosition {
    pub fn new<P: Into<PathBuf>>(
        path: P,
        position: (usize, usize)
    ) -> FilePosition {
        FilePosition { path: path.into(), position }
    }

    pub fn path(&self) -> &Path { &self.path }

    pub fn position(&self) -> (usize, usize) { self.position }

    pub fn compute_range(&self, image: &str) -> FileRange {
        if !image.contains('\n') { return FileRange::new(self.path, self.position, (self.position.0, self.position.1 + image.len() - 1)); }
        let length = image.len();
        // if the image ends with a newline, we have to ignore it because it is included within the previous line
        let search = if image.ends_with('\n') { &image[..length - 2] } else { image };
        // number of line breaks in the string
        let numBreaks = search.chars().filter(|&c| { c == '\n' }).count();
        // number of characters after the previous line break (use the real length here)
        let trailing = length - search.rfind('\n').expect("") - 1;
        FileRange::new(self.path, self.position, (self.position.0 + numBreaks, trailing))
    }

    pub fn next_line(&self) -> FilePosition {
        let mut pos = self.clone();
        pos.position = (pos.position.0 + 1, 0);
        pos
    }

    pub fn next_column(&self) -> FilePosition {
        let mut pos = self.clone();
        pos.position = (pos.position.0, pos.position.1 + 1);
        pos
    }
}

/// Represents a range of text in a specific file on this system:
/// - the path of the file
/// - the start line/column of the range
/// - the end line/column of the range
#[derive(Clone, Debug)]
pub struct FileRange {
    path: PathBuf,
    start: (usize, usize),
    end: (usize, usize)
}

impl FileRange {
    pub fn new(
        path: PathBuf,
        start: (usize, usize),
        end: (usize, usize)
    ) -> FileRange {
        FileRange { path, start, end }
    }

    pub fn path(&self) -> &Path { &self.path }

    pub fn start(&self) -> (usize, usize) { self.start }

    pub fn end(&self) -> (usize, usize) { self.end }

    /**
     * Create a new location that contains both this location and the specified location
     */
    pub fn merge(&self, location: &FileRange) -> FileRange {
        // TODO: don't panic
        if self.path != location.path { panic!("Two locations in different files cannot be merged."); }
        let mut start = self.start;
        let mut end = self.end;
        if location.start.0 < self.start.0 || location.start.0 == self.start.0 && location.start.1 < self.start.1 {
            start = (location.start.0, location.start.0);
        } else if location.end.0 > self.end.0 || location.end.0 == self.end.0 && location.end.1 > self.end.1 {
            end = (location.end.0, location.end.1);
        }
        FileRange::new(self.path, start, end)
    }
}

/// The level of a diagnostic, listed in order so that comparison operators can be used
#[repr(u8)]
#[derive(Clone, Debug, PartialOrd, PartialEq)]
pub enum DiagnosticLevel {
    /** Diagnostics that should only appear when the user requests as much information as possible */
    Verbose = 1,
    /** Diagnostics that serve to notify the user, and can be safely ignored */
    Message = 2,
    /** Diagnostics that indicate a problem that will not trigger a failure, but may trigger a failure later on */
    Warning = 3,
    /** Diagnostics that indicate a problem that will trigger a failure */
    Error = 4,
    /** Diagnostics that indicate a problem that causes compilation to immediately fail */
    Fatal = 5,
}

/// Represents a message to report to the user as an output of compilation.
#[derive(Clone, Debug)]
pub struct Diagnostic {
    pub location: FileRange,
    pub message: String,
    pub level: DiagnosticLevel
}

impl Diagnostic {
    pub fn new(
        message: String,
        location: FileRange
    ) -> Diagnostic {
        Diagnostic {
            message,
            location,
            level: DiagnosticLevel::Error
        }
    }

    pub fn new_from_position(
        message: String,
        location: FilePosition
    ) -> Diagnostic {
        Diagnostic {
            message,
            location: FileRange::new(location.path, location.position, location.position),
            level: DiagnosticLevel::Error
        }
    }

    pub fn with_level(self, level: DiagnosticLevel) -> Diagnostic {
        self.level = level;
        self
    }
}

impl Display for Diagnostic {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let FileRange { path, start: (line, column), .. } = self.location;
        write!(f, "{:?}: {} ({}:{}:{})", self.level, self.message, path.to_str().ok_or(fmt::Error)?, line, column)
    }
}

/// Similar to `Result`, but combines the `Ok` and `Err` variants
/// and carries a `Vec<Diagnostic>` for errors.
/// 
/// The "OK" case will use `Some` for the internal `Option`,
/// but may still have a `Vec<Diagnostic>` for warnings and other messages.
/// 
/// The "error" case will use `None` for the internal `Option`,
/// and will have at least one error diagnostic in its list.
/// 
/// This type implements `Try` so it can be used with the `?` operator.
/// This will yield a `Result<DiagResult, Vec<Diagnostic>>`.
pub struct DiagResult<T>(Option<T>, Vec<Diagnostic>);

impl<T> DiagResult<T> {
    pub fn ok(result: T) -> DiagResult<T> {
        DiagResult(Some(result), vec![])
    }
}

impl<T> Try for DiagResult<T> {
    type Ok = Self;
    type Error = Vec<Diagnostic>;

    fn into_result(self) -> Result<Self, Self::Error> {
        match self {
            DiagResult(None, diags) => Err(diags),
            _ => Ok(self),
        }
    }

    fn from_error(v: Self::Error) -> Self {
        DiagResult(None, v)
    }

    fn from_ok(v: Self) -> Self {
        v
    }
}
