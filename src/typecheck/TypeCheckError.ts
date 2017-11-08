import { Location } from '~/parser/Tokenizer';


export default class TypeCheckError extends Error {
    file: string;
    location: Location;

    constructor(message: string, file: string, location: Location) {
        super(TypeCheckError.constructMessage(message, file, location));
        this.file = file;
        this.location = location;
    }

    static constructMessage(message: string, file: string, location: Location) {
        return `${message} [${file}:${location.startLine}:${location.startColumn}]`;
    }
}
