export default class TypeCheckError extends Error {
    constructor(message, file, location) {
        super(TypeCheckError.constructMessage(message, file, location));
        this._message = message;
        this.file = file;
        this.location = location;
    }

    static constructMessage(message, file, location) {
        return `${message} [${file}:${location.startLine}:${location.startColumn}]`;
    }
}
