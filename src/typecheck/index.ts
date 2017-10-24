import TypeChecker from './TypeChecker';
import { STProgram } from '../syntax/declarations/Program';


export default function typecheck(ast: STProgram, path: string) {
    return new TypeChecker().check(ast, path);
}
