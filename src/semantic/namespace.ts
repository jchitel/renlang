import { CoreObject } from '~/core';
import * as syntax from '~/syntax';
import { Dependency } from '~/semantic/passes/dependencies';


// #region Namespaces

/** Base class for namespaces, contains all reference collections and reference-related logic */
class NamespaceBase extends CoreObject {
    /** Contains all references for all names locally-scoped to the namespace */
    readonly locals: ReadonlyMap<string, NameTarget> = new Map();
    /** Contains all references for all of this namespace's exported names */
    readonly exports: ReadonlyMap<string, NameTarget> = new Map();

    constructor(readonly namespaceId: number) { super() }

    ensureLocalTarget(name: string, mutator?: (target: NameTarget) => NameTarget) {
        let target = this.getLocalTarget(name);
        target = mutator ? mutator(target) : target;
        return this.mutate('locals', _ => _.iset(name, target));
    }

    ensureExportTarget(name: string, mutator?: (target: NameTarget) => NameTarget) {
        let target = this.getExportTarget(name);
        target = mutator ? mutator(target) : target;
        return this.mutate('exports', _ => _.iset(name, target));
    }

    // #region helpers

    /** Gets the NameTarget corresponding to a local */
    getLocalTarget(name: string) { return this.locals.get(name) || new NameTarget() }
    /** Gets the NameTarget corresponding to an export */
    getExportTarget(name: string) { return this.exports.get(name) || new NameTarget() }

    /** Modifies a local's NameTarget */
    mutateLocalTarget(name: string, fn: (target: NameTarget) => NameTarget) {
        return this.mutate('locals', _ => _.iset(name, fn(this.getLocalTarget(name))));
    }

    /** Modifies an export's NameTarget */
    mutateExportTarget(name: string, fn: (target: NameTarget) => NameTarget) {
        return this.mutate('exports', _ => _.iset(name, fn(this.getExportTarget(name))));
    }

    // #endregion
    // #region local references

    /** Adds a resolved reference for an imported name */
    addImportedName(name: string, modulePath: string, exportName: string, declarationId: number) {
        return this.mutateLocalTarget(name, _ => _.addReference(new RemoteName(modulePath, exportName, declarationId)));
    }

    /** Adds a resolved reference for an imported namespace */
    addImportedNamespace(name: string, modulePath: string, declarationId: number) {
        return this.mutateLocalTarget(name, _ => _.addReference(new RemoteNamespace(modulePath, declarationId)));
    }

    /** Adds a resolved reference for a local declaration */
    addLocalDeclaration(name: string, declarationId: number) {
        return this.mutateLocalTarget(name, _ => _.addReference(new LocalDeclaration(declarationId)));
    }

    // #endregion
    // #region export references

    /** Adds a resolved reference for a forwarded name */
    addForwardedName(name: string, modulePath: string, exportName: string, declarationId: number) {
        return this.mutateExportTarget(name, _ => _.addReference(new RemoteName(modulePath, exportName, declarationId)));
    }

    /** Adds a resolved reference for a forwarded namespace */
    addExportedRemoteNamespace(name: string, modulePath: string, declarationId: number) {
        return this.mutateExportTarget(name, _ => _.addReference(new RemoteNamespace(modulePath, declarationId)));
    }

    /** Adds a resolved reference for an exported local name */
    addExportedName(name: string, local: string, declarationId: number) {
        return this.mutateExportTarget(name, _ => _.addReference(new LocalName(local, declarationId)));
    }

    /** Adds a resolved reference for an exported inline declaration */
    addExportedDeclaration(name: string, declarationId: number) {
        return this.mutateExportTarget(name, _ => _.addReference(new LocalDeclaration(declarationId)));
    }

    // #endregion
}

/**
 * A namespace declared within another namespace.
 * This contains its parent's namespace id, and the corresponding id and syntax
 * of its declaration.
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
 * A module is a type of namespace, but has no parent, is not a declaration,
 * and is alternatively identified by its file path.
 * Other than that, it still has locals and exports just like any other namespace.
 * Most namespaces in a program will be module namespaces.
 */
export class ModuleNamespace extends NamespaceBase {
    constructor(
        namespaceId: number,
        readonly absolutePath: string
    ) { super(namespaceId); }
}

/** A namespace is either a module or a declared namespace nested within another namespace. */
export type Namespace = ModuleNamespace | NestedNamespace;

// #endregion

// #region ModuleRefs

interface NonSuccessModuleRef {
    readonly namespaceId: null;
    readonly status: ModuleStatus.REFERENCED | ModuleStatus.UNPARSED | ModuleStatus.NOT_FOUND;
    readonly fullyResolved: boolean;
}

interface SuccessModuleRef {
    readonly namespaceId: number;
    readonly status: ModuleStatus.SUCCESS;
    readonly fullyResolved: boolean;
}

/**
 * A ModuleRef is a reference to a module namespace.
 * It will either be successful (resolved), or not successful (either not yet resolved or unresolvable).
 * All successful module references will have a resolved namespace id.
 */
export type ModuleRef = NonSuccessModuleRef | SuccessModuleRef;

export enum ModuleStatus {
    /** The initial state of any module that is referenced, including the entry. Nothing has been done with it yet. */
    REFERENCED,
    /** The module was found and parsed */
    SUCCESS,
    /** The module was found, but failed to parse */
    UNPARSED,
    /** The module was not found */
    NOT_FOUND
}

// #endregion

// #region NameTargets and References

/**
 * Name targets in a program have to be quite complex for a number of reasons,
 * the primary ones being that:
 * - namespaces can circularly reference one another
 * - declaration merging (having a name resolve to multiple declarations) is valid
 * 
 * A namespace has two lists: a list of locals (locally-scoped names) and a list of
 * exports (externally-accessible names). These "lists" are mappings from a name
 * to a name target.
 * 
 * A name target, once everything is said and done, has simply a list of references.
 * 
 * A reference, once everything is said and done, can be one of 8 types, which are divided
 * into 3 categories:
 * - resolved references (references that correspond to a declaration id):
 *   - remote name (a reference to an export of another module)
 *   - remote namespace (a reference to the top-level namespace of a module)
 *   - local name (a reference to some locally-scoped name)
 *   - local declaration (a direct reference to a local declaration)
 * - dangling references (references whose targets do not exist)
 *   - missing module (a reference to a non-existent module)
 *   - missing export (a reference to a non-existent export of an existent module)
 *   - missing local (a reference to a non-existent local)
 * - circular references (references that depend indirectly to themselves, which are a special type of dangling reference)
 * 
 * This structure forms a tree: namespace -(1:many)-> name -(1:1)-> name target -(1:many)-> reference
 * 
 * This makes sense at face value, but becomes complex when you envision what has to happen
 * during the process of resolving all of these names and references. The enumeration
 * process, whose job it is to enumerate and register all namespaces and declarations in the program,
 * will place only direct references (always local declarations) into name targets.
 * Everything else is registered as a dependency on each name target. Dependencies have one
 * type for each logical type of dependency (the various kinds of imports, exports, and forwards).
 * 
 * To manage the potential for circular references and declaration merging,
 * the concept of a "status" has to be introduced on all three levels of the namespace tree:
 * - name targets need an "aggregate status" so that any other name targets referencing them
 *   know when they have all corresponding references fully resolved (even if they are unsuccessful)
 * - references have an implicit status. the three categories of references correspond to the three
 *   terminal statuses: resolved, dangling, and circular. there is also a special intermediate reference
 *   type called a "stub reference" that serves as a placeholder to indicate when a reference is in the
 *   process of being resolved. this serves the purpose of preventing infinite recursion when dealing
 *   with circular references.
 */
export class NameTarget extends CoreObject {
    readonly status: NameTargetStatus = NameTargetStatus.NOT_RESOLVED;
    readonly references: ReadonlyArray<Reference> = [];
    readonly dependencies: ReadonlyArray<Dependency> = [];

    addReference(ref: Reference): NameTarget {
        return this.mutate('references', _ => [..._, ref])
    }

    addDependency(dep: Dependency): NameTarget {
        return this.mutate('dependencies', _ => [..._, dep]);
    }

    popDependency(): [Dependency, NameTarget] {
        const [dep, ...deps] = this.dependencies;
        return [dep, this.set('dependencies', deps)];
    }

    setAggregateStatus(): NameTarget {
        if (this.references.some(_ => _.status === NameTargetStatus.FULLY_RESOLVED))
            return this.set('status', NameTargetStatus.FULLY_RESOLVED);
        if (this.references.some(_ => _.status === NameTargetStatus.DANGLING))
            return this.set('status', NameTargetStatus.DANGLING);
        if (this.references.some(_ => _.status === NameTargetStatus.CIRCULAR))
            return this.set('status', NameTargetStatus.CIRCULAR);
        return this.set('status', NameTargetStatus.EMPTY);
    }
}

export enum NameTargetStatus {
    NOT_RESOLVED = 1, // not yet visited or currently being visited
    FULLY_RESOLVED, // done being visited
    DANGLING, // no references could be resolved
    CIRCULAR, // all references are circular
    EMPTY // all references could be resolved, but none contain a declaration
}

export type Reference = ResolvedReference | DanglingReference | CircularReference | EmptyReference;

export type ResolvedReference = RemoteName | RemoteNamespace | LocalName | LocalDeclaration;

/**
 * A reference to an export name from another module.
 */
export class RemoteName extends CoreObject {
    readonly status = NameTargetStatus.FULLY_RESOLVED;

    constructor(
        readonly modulePath: string,
        readonly exportName: string,
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A pointer to a module's top-level namespace
 */
export class RemoteNamespace extends CoreObject {
    readonly status = NameTargetStatus.FULLY_RESOLVED;

    constructor(
        readonly modulePath: string,
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A reference to a name that is scoped to the current module
 */
export class LocalName extends CoreObject {
    readonly status = NameTargetStatus.FULLY_RESOLVED;

    constructor(
        readonly name: string,
        readonly resolvedDeclarationId: number
    ) { super() }
}

/**
 * A direct reference to a local declaration.
 */
export class LocalDeclaration extends CoreObject {
    readonly status = NameTargetStatus.FULLY_RESOLVED;

    constructor(
        readonly resolvedDeclarationId: number
    ) { super() }
}

export type DanglingReference = MissingModule | MissingExport | MissingLocal;

/**
 * A reference to a module that doesn't exist.
 * This applies for both named and wildcard imports/forwards.
 */
export class MissingModule extends CoreObject {
    readonly status = NameTargetStatus.DANGLING;

    constructor(
        readonly modulePath: string,
        readonly exportName: Optional<string>
    ) { super() }
}

/**
 * A reference to a module's export where the module exists,
 * but the export does not.
 * This applies only for named imports/forwards.
 */
export class MissingExport extends CoreObject {
    readonly status = NameTargetStatus.DANGLING;

    constructor(
        readonly modulePath: string,
        readonly exportName: string
    ) { super() }
}

/**
 * A reference to a local that doesn't exist.
 * This applies only to named exports.
 */
export class MissingLocal extends CoreObject {
    readonly status = NameTargetStatus.DANGLING;

    constructor(
        readonly localName: string
    ) { super() }
}

export type CircularReference = RemoteCircularReference | LocalCircularReference;

/**
 * A remote reference whose dependency chain circles back on itself.
 * This applies only to named imports/forwards.
 */
export class RemoteCircularReference extends CoreObject {
    readonly status = NameTargetStatus.CIRCULAR;

    constructor(
        readonly modulePath: string,
        readonly exportName: string
    ) { super() }
}

/**
 * A local reference whose dependency chain circles back on itself.
 * This applies only to named exports.
 */
export class LocalCircularReference extends CoreObject {
    readonly status = NameTargetStatus.CIRCULAR;

    constructor(
        readonly localName: string
    ) { super() }
}

export type EmptyReference = RemoteEmptyReference | LocalEmptyReference;

/**
 * This is a "chained" remote dangling or circular reference.
 * The dependency could be resolved, but the end of the chain
 * doesn't actually resolve to a declaration.
 */
export class RemoteEmptyReference extends CoreObject {
    readonly status = NameTargetStatus.EMPTY;

    constructor(
        readonly modulePath: string,
        readonly exportName: string
    ) { super() }
}

/**
 * This is a "chained" local dangling or circular reference.
 * The dependency could be resolved, but the end of the chain
 * doesn't actually resolve to a declaration.
 */
export class LocalEmptyReference extends CoreObject {
    readonly status = NameTargetStatus.EMPTY;

    constructor(
        readonly localName: string
    ) { super() }
}

// #endregion

// #region Declarations

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

// #endregion
