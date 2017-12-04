export default class ParserError extends Error {
    baseMessage: string;
    line: number;
    column: number;

    constructor(message: string, line: number, column: number) {
        super(ParserError.getMessage(message, line, column));
        Object.assign<ParserError>(this, { baseMessage: message, line, column });
    }

    static getMessage(message: string, line: number, column: number) {
        const formatted = message.charAt(0).toUpperCase() + message.substring(1);
        return `${formatted} (Line ${line}, Column ${column})`;
    }
}
