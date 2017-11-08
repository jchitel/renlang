import { Token } from '~/parser/Tokenizer';
import CSTNode from '~/syntax/CSTNode';


export function nodeToObject(node: CSTNode) {
    const obj: { [key: string]: any } = {};
    for (const key of Object.keys(node)) {
        const val = node[key];
        if (val instanceof Token) {
            obj[key] = val.image;
        } else if (val instanceof CSTNode) {
            obj[key] = nodeToObject(val);
        } else if (Array.isArray(val)) {
            obj[key] = val.map(v => (v instanceof Token) ? v.image : nodeToObject(v));
        }
    }
    return obj;
}