import { Diagnostic, CoreObject } from '~/core';


/**
 * A complete semantic program. This is the top-level data structure
 * for the semantic process of the compiler.
 */
export class Program extends CoreObject {
    readonly modules: ReadonlyMap<string, Module> = new Map();
    readonly declarations: ReadonlyArray<Declaration> = [];
    readonly diagnostics: ReadonlyArray<Diagnostic> = [];
}

/**
 * An abstract object representing a "namespace".
 * Serves as a parent class for modules and declared namespaces,
 * both of which are semantically "namespaces".
 */
export abstract class Namespace extends CoreObject {
    readonly localNames: Map<string, NameTarget[]> = new Map();
    readonly exports: Map<string, NameTarget[]> = new Map();
    readonly declarations: Declaration[] = [];

    constructor(
        readonly namespaceId: number
    ) { super(); }
}

/**
 * A declared namespace within another namespace.
 * It has a name, a parent namespace id, and a declaration id (because it is a declaration).
 */
export class DeclaredNamespace extends Namespace {
    constructor(
        namespaceId: number,
        readonly name: string,
        readonly parentNamespaceId: number,
        readonly declarationId: number
    ) { super(namespaceId); }
}

/**
 * A semantic container for a module in a program.
 * A module is a type of namespace, and can contain local names, exports, and declarations.
 * Where it differs from a generic namespace is that it has no parent namespace, and is associated with a file path.
 */
export class Module extends Namespace {
    constructor(
        namespaceId: number,
        readonly absolutePath: string
    ) { super(namespaceId); }
}

/**
 * For any given name in a program, there are target(s) to which that name resolves.
 * A target will always be either:
 * - an export name of another module
 * - a module's namespace
 * - a locally-scoped name
 * - a declaration inline with the name (only in the case of exported declarations)
 */
export type NameTarget = RemoteName | RemoteNamespace | LocalName | LocalDeclaration;

/**
 * A remote name is reference to an export name from another module.
 */
export class RemoteName extends CoreObject {
    constructor(
        readonly modulePath: string,
        readonly exportName: string,
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A remote namespace is a pointer to a module's top-level namespace
 */
export class RemoteNamespace extends CoreObject {
    constructor(
        readonly modulePath: string
    ) { super() }
}

/**
 * A local name is a reference to a name that is scoped to the current module
 */
export class LocalName extends CoreObject {
    constructor(
        readonly name: string,
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A local declaration is a reference to a declaration that has no name,
 * i.e. in the case of an anonymous default export.
 */
export class LocalDeclaration extends CoreObject {
    constructor(
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A semantic declaration is a node that is ultimately associated with a name
 */
export type Declaration = DeclaredFunction | DeclaredType | DeclaredConstant | DeclaredNamespace;

export class DeclaredFunction extends CoreObject {
    constructor(
        readonly name: string,
        readonly declarationId: number
    ) { super() }
}

export class DeclaredType extends CoreObject {
    constructor(
        readonly name: string,
        readonly declarationId: number
    ) { super() }
}

export class DeclaredConstant extends CoreObject {
    constructor(
        readonly name: string,
        readonly declarationId: number
    ) { super() }
}
