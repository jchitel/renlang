import Translator from './Translator';


export default function translate(modules) {
    return new Translator().translate(modules);
}
