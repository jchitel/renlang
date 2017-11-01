import TypeChecker from './TypeChecker';
import { STProgram } from '../syntax/declarations/cst';


export default function typecheck(ast: STProgram, path: string) {
    return new TypeChecker().check(ast, path);
}
