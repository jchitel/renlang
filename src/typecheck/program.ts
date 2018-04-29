import { Diagnostic, CoreObject } from '~/core';
import * as syntax from '~/syntax';


/**
 * A complete semantic program. This is the top-level data structure
 * for the semantic process of the compiler.
 */
export class Program extends CoreObject<Program> {
    readonly modules: ReadonlyMap<string, Module> = new Map();
    readonly declarations: ReadonlyArray<Declaration> = [];
    readonly diagnostics: ReadonlyArray<Diagnostic> = [];
}

/**
 * A semantic container for a module in a program.
 * A module contains a list of declarations (by name) accessible inside the module
 * and a list of exports (by name) accessible from outside the module
 */
export class Module extends CoreObject<Module> {
    readonly declarations: ReadonlyMap<string, MappingGroup> = new Map();
    readonly exports: ReadonlyMap<string, MappingGroup> = new Map();
}

/**
 * For a given name, the mapping of resolved declaration id to the next link
 * in the resolution chain. There are two kinds of mappings:
 * - local: the end of a chain. the resolved declaration exists in this module.
 * - import: pointer to another link in the chain, containing the module/export combination to look up next.
 */
export interface MappingGroup {
    readonly mappings: ReadonlyMap<number, LocalMapping | ImportMapping>;
}

interface LocalMapping {
    kind: 'local';
}

interface ImportMapping {
    kind: 'import';
    modulePath: string;
    exportName: string;
}

/**
 * A semantic declaration is a node that is ultimately associated with a name, either:
 * - a function
 * - a type
 * - a constant
 * - a namespace, created via a wildcard import or export forward
 */
export type Declaration = FunctionDeclaration | TypeDeclaration | ConstantDeclaration | Namespace;

export interface FunctionDeclaration {
    kind: 'function';
    syntaxNode: syntax.FunctionDeclaration;
}

export interface TypeDeclaration {
    kind: 'type';
    syntaxNode: syntax.TypeDeclaration;
}

export interface ConstantDeclaration {
    kind: 'constant';
    syntaxNode: syntax.ConstantDeclaration;
}

export interface Namespace {
    kind: 'namespace';
    syntaxNode: syntax.ImportDeclaration | syntax.ExportForwardDeclaration;
}
