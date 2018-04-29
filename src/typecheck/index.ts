import { TypeChecker } from './checker';


export default function typecheck(path: string) {
    const checker = TypeChecker();
    return checker.check(path);
}
