import Interpreter from './Interpreter';


export default function interpret(functions, args) {
    return new Interpreter().execute(functions, args);
}
