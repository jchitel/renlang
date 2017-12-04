import TypeChecker from './TypeChecker';
import { Program } from '~/syntax';


export default function typecheck(ast: Program, path: string) {
    return new TypeChecker().check(ast, path);
}
