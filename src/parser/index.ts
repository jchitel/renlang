import { acceptProgram } from './parser-impl';
import Parser from './Parser';


export default function parse(source: string) {
    return acceptProgram(new Parser(source));
}
