/**
 * Base type of all types in this project.
 * JS classes are not particularly well-suited for immutable operations,
 * so this provides some base-level operations to handle that.
 * The type parameter must be the same type, because TS doesn't handle
 * 'this' type properly for some reason.
 */
export class CoreObject {
    /**
     * Creates a shallow copy of 'this'.
     * TODO: this will be a problem for methods specified as arrow function properties
     */
    clone(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }

    /**
     * Sets a property of 'this' to a value, returning a new object with the value
     */
    set<K extends keyof this>(key: K, value: this[K]): this {
        const obj = this.clone();
        return Object.assign(obj, { [key]: value });
    }

    /**
     * Mutates a property of 'this' using the specified function, returning a new object with the result value
     */
    mutate<K extends keyof this>(key: K, fn: (val: this[K]) => this[K]): this {
        const obj = this.clone();
        return Object.assign(obj, { [key]: fn(this[key]) });
    }
}

export class FilePosition extends CoreObject {
    constructor(
        readonly path: string,
        readonly position: [number, number]
    ) {
        super();
    }

    computeRange(image: string): FileRange {
        if (!image.includes('\n')) return new FileRange(this.path, this.position, [this.position[0], this.position[1] + image.length - 1]);
        const length = image.length;
        // if the image ends with a newline, we have to ignore it because it is included within the previous line
        const search = image.endsWith('\n') ? image.substring(0, length - 2) : image;
        // number of line breaks in the string
        const numBreaks = [...search].filter(c => c === '\n').length;
        // number of characters after the previous line break (use the real length here)
        const trailing = length - search.lastIndexOf('\n') - 1;
        return new FileRange(this.path, this.position, [this.position[0] + numBreaks, trailing]);
    }

    nextLine(): FilePosition {
        return this.mutate('position', ([l]) => [l + 1, 0] as this['position']);
    }

    nextColumn(): FilePosition {
        return this.mutate('position', ([l, c]) => [l, c + 1] as this['position']);
    }
}

/**
 * Represents a range of text in a specific file on this system:
 * - the path of the file
 * - the start line/column of the range
 * - the end line/column of the range
 */
export class FileRange extends CoreObject {
    constructor(
        readonly path: string,
        readonly start: [number, number],
        readonly end: [number, number]
    ) {
        super();
    }

    /**
     * Create a new location that contains both this location and the specified location
     */
    merge(location: FileRange): FileRange {
        if (this.path !== location.path) throw new Error('Two locations in different files cannot be merged.');
        let start = this.start;
        let end = this.end;
        if (location.start[0] < this.start[0] || location.start[0] === this.start[0] && location.start[1] < this.start[1]) {
            [start[0], start[1]] = [location.start[0], location.start[0]];
        } else if (location.end[0] > this.end[0] || location.end[0] === this.end[0] && location.end[1] > this.end[1]) {
            [end[0], end[1]] = [location.end[0], location.end[1]];
        }
        return new FileRange(this.path, start, end);
    }
}

/**
 * The level of a diagnostic, listed in order so that comparison operators can be used
 */
export enum DiagnosticLevel {
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

/**
 * Represents a message to report to the user as an output of compilation.
 */
export class Diagnostic extends CoreObject {
    readonly location: FileRange;

    constructor(
        readonly message: string,
        location: FileRange | FilePosition,
        readonly level: DiagnosticLevel = DiagnosticLevel.Error
    ) {
        super();
        if (location instanceof FilePosition) location = new FileRange(location.path, location.position, location.position);
        this.location = location;
    }

    diagToString(): string {
        const { path, start: [line, column] } = this.location;
        return `${DiagnosticLevel[this.level]}: ${this.message} (${path}:${line}:${column})`;
    }
}
