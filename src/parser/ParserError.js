export default class ParserError extends Error {
    constructor(message, startLine, startColumn, endLine = startLine, endColumn = startColumn) {
        super(ParserError.getMessage(message, startLine, startColumn, endLine, endColumn));
        Object.assign(this, {
            baseMessage: message,
            startLine,
            startColumn,
            endLine,
            endColumn,
        });
    }

    static getMessage(message, startLine, startColumn, endLine, endColumn) {
        const formatted = message.charAt(0).toUpperCase() + message.substring(1);
        if (startLine === endLine && startColumn === endColumn) {
            return `${formatted} (Line ${startLine}, Column ${startColumn})`;
        } else {
            return `${formatted} (Line ${startLine}, Column ${startColumn})-(Line ${endLine}, Column ${endColumn})`;
        }
    }
}
