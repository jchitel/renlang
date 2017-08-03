import TypeChecker from './TypeChecker';


export default function typecheck(ast, path) {
    return new TypeChecker().check(ast, path);
}
