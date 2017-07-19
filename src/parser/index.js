import Parser from './Parser';


export default function parse(source) {
    return new Parser().parse(source);
}