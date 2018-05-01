import { TypeChecker } from './checker';


export default function typecheck(path: string) {
    const checker = new TypeChecker();
    return checker.check(path);
}
