import Translator from './Translator';
import Module from '../runtime/Module';


export default function translate(modules: Module[]) {
    return new Translator().translate(modules);
}
