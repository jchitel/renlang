export interface FilePosition {
    readonly type: 'FilePosition';
    readonly path: string;
    readonly position: [number, number];
    readonly computeRange: (image: string) => FileRange;
    readonly nextLine: () => FilePosition;
    readonly nextColumn: () => FilePosition;
}

export function FilePosition(path: string, position: [number, number]): FilePosition {
    return { type: 'FilePosition', path, position, computeRange, nextLine, nextColumn };
}

function computeRange(this: FilePosition, image: string) {
    if (!image.includes('\n')) return FileRange(this.path, this.position, [this.position[0], this.position[1] + image.length - 1]);
    const length = image.length;
    // if the image ends with a newline, we have to ignore it because it is included within the previous line
    const search = image.endsWith('\n') ? image.substring(0, length - 2) : image;
    // number of line breaks in the string
    const numBreaks = [...search].filter(c => c === '\n').length;
    // number of characters after the previous line break (use the real length here)
    const trailing = length - search.lastIndexOf('\n') - 1;
    return FileRange(this.path, this.position, [this.position[0] + numBreaks, trailing]);
}

function nextLine(this: FilePosition): FilePosition {
    return { ...this, position: [this.position[0] + 1, 0] };
}

function nextColumn(this: FilePosition): FilePosition {
    return { ...this, position: [this.position[0], this.position[1] + 1] };
}

/**
 * Represents a range of text in a specific file on this system:
 * - the path of the file
 * - the start line/column of the range
 * - the end line/column of the range
 */
export interface FileRange {
    readonly type: 'FileRange';
    readonly path: string;
    readonly start: [number, number];
    readonly end: [number, number];
    readonly merge: (location: FileRange) => FileRange;
}

export function FileRange(path: string, start: [number, number], end: [number, number]): FileRange {
    return { type: 'FileRange', path, start, end, merge };
}

/**
 * Create a new location that contains both this location and the specified location
 */
function merge(this: FileRange, location: FileRange): FileRange {
    if (this.path !== location.path) throw new Error('Two locations in different files cannot be merged.');
    let start = this.start;
    let end = this.end;
    if (location.start[0] < this.start[0] || location.start[0] === this.start[0] && location.start[1] < this.start[1]) {
        [start[0], start[1]] = [location.start[0], location.start[0]];
    } else if (location.end[0] > this.end[0] || location.end[0] === this.end[0] && location.end[1] > this.end[1]) {
        [end[0], end[1]] = [location.end[0], location.end[1]];
    }
    return FileRange(this.path, start, end);
}

/**
 * The level of a diagnostic, listed in order so that comparison operators can be used:
 * - Verbose: diagnostics that should only appear when the user requests as much information as possible
 * - Message: diagnostics that serve to notify the user, and can be safely ignored
 * - Warning: diagnostics that indicate a problem that will not trigger a failure
 * - Error: diagnostics that indicate a problem that will trigger a failure
 * - Fatal: diagnostics that indicate a problem that causes compilation to immediately fail
 */
export enum DiagnosticLevel {
    Verbose = 1,
    Message = 2,
    Warning = 3,
    Error = 4,
    Fatal = 5,
}

/**
 * Represents a message to report to the user as an output of compilation.
 */
export interface Diagnostic {
    readonly level: DiagnosticLevel;
    readonly message: string;
    readonly location: FileRange;
    readonly toString: () => string;
}

export function Diagnostic(message: string, location: FileRange | FilePosition, level: DiagnosticLevel = DiagnosticLevel.Error): Diagnostic {
    if (location.type === 'FilePosition') location = FileRange(location.path, location.position, location.position);
    return { message, location, level, toString: diagToString };
}

function diagToString(this: Diagnostic) {
    const { path, start: [line, column] } = this.location;
    return `${DiagnosticLevel[this.level]}: ${this.message} (${path}:${line}:${column})`;
}
