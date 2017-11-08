import Interpreter from './Interpreter';
import Func from '~/translator/Func';


export default function interpret(functions: Func[], args: string[]) {
    return new Interpreter(functions).execute(args);
}
