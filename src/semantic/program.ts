import { Diagnostic, CoreObject } from '~/core';
import { Declaration, Namespace } from './namespace';


/**
 * A complete semantic program. This is the top-level data structure
 * for the semantic process of the compiler.
 */
export class Program extends CoreObject {
    readonly modules: ReadonlyMap<string, number> = new Map();
    readonly namespaces: ReadonlyArray<Namespace> = [];
    readonly declarations: ReadonlyArray<Declaration> = [];
    readonly diagnostics: ReadonlyArray<Diagnostic> = [];
}
