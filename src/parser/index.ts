import { Program } from '~/syntax';
import Parser from './Parser';


export default function parse(source: string) {
    return new Parser(source).parse(Program) as Program;
}
