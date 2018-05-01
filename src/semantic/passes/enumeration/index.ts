import { Module, Namespace, Declaration } from '~/semantic/program';
import { Dependency } from '~/semantic/passes/resolution';


export interface NamespaceEnumerationOutput {
    readonly modules: ReadonlyMap<string, Module>;
    readonly namespaces: ReadonlyArray<Namespace>;
    readonly declarations: ReadonlyArray<Declaration>;
    readonly dependencyQueue: ReadonlyArray<Dependency>;
}

export default function enumerateNamespaces(mainModulePath: string): NamespaceEnumerationOutput {
    //
}