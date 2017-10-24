export default class ParserError extends Error {
    baseMessage: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;

    constructor(message: string, startLine: number, startColumn: number, endLine = startLine, endColumn = startColumn) {
        super(ParserError.getMessage(message, startLine, startColumn, endLine, endColumn));
        Object.assign<ParserError>(this, {
            baseMessage: message,
            startLine,
            startColumn,
            endLine,
            endColumn,
        });
    }

    static getMessage(message: string, startLine: number, startColumn: number, endLine: number, endColumn: number) {
        const formatted = message.charAt(0).toUpperCase() + message.substring(1);
        if (startLine === endLine && startColumn === endColumn) {
            return `${formatted} (Line ${startLine}, Column ${startColumn})`;
        } else {
            return `${formatted} (Line ${startLine}, Column ${startColumn})-(Line ${endLine}, Column ${endColumn})`;
        }
    }
}
