import TypeChecker from './TypeChecker';


export default function typecheck(ast) {
    return new TypeChecker(ast).check();
}
