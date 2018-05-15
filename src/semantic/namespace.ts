import { CoreObject } from '~/core';
import { FunctionDeclaration, TypeDeclaration, ConstantDeclaration, AnonymousFunctionDeclaration, AnonymousTypeDeclaration, AnonymousConstantDeclaration, NamespaceDeclaration, AnonymousNamespaceDeclaration } from '~/syntax';

/**
 * An abstract object representing a "namespace".
 * Serves as a parent class for modules and declared namespaces,
 * both of which are semantically "namespaces".
 */
export abstract class Namespace extends CoreObject {
    readonly localNames: ReadonlyMap<string, ReadonlyArray<NameTarget>> = new Map();
    readonly exports: ReadonlyMap<string, ReadonlyArray<NameTarget>> = new Map();

    constructor(
        readonly namespaceId: number
    ) { super(); }

    addImport(targetModule: string, localName: string, exportName: string): Namespace {
        let target: NameTarget;
        if (exportName === '*') {
            target = { modulePath: targetModule } as RemoteNamespace;
        } else {
            target = { modulePath: targetModule, exportName } as RemoteName;
        }
        const array = [...(this.localNames.get(localName) || []), target];
        return this.clone({ localNames: this.localNames.iset(localName, array) });
    }

    addForward(targetModule: string, forwardName: string, exportName: string): Namespace {
        let target: NameTarget;
        if (exportName === '*') {
            // if it's a pure forward, we can't resolve anything right now
            if (forwardName === '*') return this;
            target = { modulePath: targetModule } as RemoteNamespace;
        } else {
            target = { modulePath: targetModule, exportName } as RemoteName;
        }
        const array = [...(this.exports.get(forwardName) || []), target];
        return this.clone({ exports: this.exports.iset(forwardName, array) });
    }
}

/**
 * A declared namespace within another namespace.
 * It has a name, a parent namespace id, and a declaration id (because it is a declaration).
 */
export class DeclaredNamespace extends Namespace {
    constructor(
        namespaceId: number,
        readonly parentNamespaceId: number,
        readonly declarationId: number,
        readonly namespaceDeclaration: NamespaceDeclaration | AnonymousNamespaceDeclaration
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
export type DeclaredEntity = DeclaredFunction | DeclaredType | DeclaredConstant | DeclaredNamespace;

/**
 * A semantic function entity, identified by a name.
 */
export class DeclaredFunction extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly functionDeclaration: FunctionDeclaration | AnonymousFunctionDeclaration
    ) { super() }
}

/**
 * A semantic type entity, identified by a name.
 * NOTE: this is different from the concept of a "type" in type checking TODO then what is?
 */
export class DeclaredType extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly typeDeclaration: TypeDeclaration | AnonymousTypeDeclaration
    ) { super() }
}

/**
 * A semantic constant entity, identified by a name.
 */
export class DeclaredConstant extends CoreObject {
    constructor(
        readonly declarationId: number,
        readonly constantDeclaration: ConstantDeclaration | AnonymousConstantDeclaration
    ) { super() }
}
