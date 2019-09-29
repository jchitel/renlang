import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


export interface NamespaceNames {
    [name: string]: number[];
}

/**
 * Namespaces are the result of having the ability to declare wildcard imports,
 * whereby all exports of a module are grouped under a single "object".
 * This "object" is called a namespace instead of a struct because weirdly
 * enough, it can contain types as well as values (functions and constants).
 * The type of a namespace is similar to that of a struct because it is a
 * grouping of name-value pairs, where the values are types.
 * However, the types and values within a namespace exist in some other module,
 * so they must be resolved. Effectively, this makes a namespace type just
 * a wrapper around a module. Any attempt to get a type or value from it
 * will require a type checker and the namespace's module to resolve it.
 */
export default class TNamespace extends TType {
    constructor(public names: NamespaceNames, public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitNamespace(this, param);
    }
}
