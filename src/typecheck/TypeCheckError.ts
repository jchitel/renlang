import { ILocation } from '../parser/Tokenizer';


export default class TypeCheckError extends Error {
    private _message: string;
    file: string;
    location: ILocation;

    constructor(message: string, file: string, location: ILocation) {
        super(TypeCheckError.constructMessage(message, file, location));
        this._message = message;
        this.file = file;
        this.location = location;
    }

    static constructMessage(message: string, file: string, location: ILocation) {
        return `${message} [${file}:${location.startLine}:${location.startColumn}]`;
    }
}
