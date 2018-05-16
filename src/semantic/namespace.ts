import { CoreObject } from '~/core';
import * as syntax from '~/syntax';


class NamespaceBase extends CoreObject {
    readonly localNames: ReadonlyMap<string, ReadonlyArray<NameTarget>> = new Map();
    readonly exports: ReadonlyMap<string, ReadonlyArray<NameTarget>> = new Map();

    constructor(readonly namespaceId: number) { super() }

    addLocalDeclaration(name: string, declarationId: number) {
        const existing = this.localNames.get(name) || [];
        return this.mutate('localNames', _ => _.iset(name, [...existing, new LocalDeclaration(declarationId)]));
    }
}

/**
 * A declared namespace within another namespace.
 * It has a name, a parent namespace id, and a declaration id (because it is a declaration).
 */
export class NestedNamespace extends NamespaceBase {
    constructor(
        namespaceId: number,
        readonly parentNamespaceId: number,
        readonly declarationId: number,
        readonly node: syntax.NamespaceDeclaration | syntax.AnonymousNamespaceDeclaration
    ) { super(namespaceId); }
}

/**
 * A semantic container for a module in a program.
 * A module is a type of namespace, and can contain local names, exports, and declarations.
 * Where it differs from a generic namespace is that it has no parent namespace, and is associated with a file path.
 */
export class ModuleNamespace extends NamespaceBase {
    constructor(
        namespaceId: number,
        readonly absolutePath: string
    ) { super(namespaceId); }
}

export type Namespace = ModuleNamespace | NestedNamespace;

/**
 * For any given name in a program, there are target(s) to which that name resolves.
 * A target will always be either:
 * - an export name of another module
 * - a module's namespace
 * - a locally-scoped name
 * - a declaration inline with the name (only in the case of exported declarations)
 */
export type NameTarget = RemoteName | RemoteNamespace | LocalName | LocalDeclaration | DanglingReference | CircularReference;

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
        readonly modulePath: string,
        readonly resolvedDeclarationId: number
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

/** Indicates that the name cannot be resolved because its target does not exist */
export class DanglingReference extends CoreObject {}

/** Indicates that the name cannot be resolved because it depends on itself */
export class CircularReference extends CoreObject {}

/**
 * A semantic declaration is a node that is ultimately associated with a name
 */
export type Declaration = FunctionDeclaration | TypeDeclaration | ConstantDeclaration | NamespaceDeclaration;

/**
 * A semantic function entity, identified by a name.
 */
export class FunctionDeclaration extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly node: syntax.FunctionDeclaration | syntax.AnonymousFunctionDeclaration
    ) { super() }
}

/**
 * A semantic type entity, identified by a name.
 */
export class TypeDeclaration extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly node: syntax.TypeDeclaration | syntax.AnonymousTypeDeclaration
    ) { super() }
}

/**
 * A semantic constant entity, identified by a name.
 */
export class ConstantDeclaration extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly node: syntax.ConstantDeclaration | syntax.AnonymousConstantDeclaration
    ) { super() }
}

export class NamespaceDeclaration extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly namespaceId: number
    ) { super() }
}
