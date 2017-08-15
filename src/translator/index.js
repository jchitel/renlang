import Translator from './Translator';


export default translate(modules) {
    return new Translator().translate(modules);
}
