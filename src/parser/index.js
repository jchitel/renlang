import { acceptProgram } from './Parser';
import Parser from './parser-control';


export default function parse(source) {
    return acceptProgram(new Parser(source));
}
