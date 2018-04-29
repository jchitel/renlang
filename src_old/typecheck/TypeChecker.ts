import { TypeError } from './TypeErrorContext';
import * as types from './types';
import TypeCheckVisitor from '~/syntax/visitors/TypeCheckVisitor';
import { TypeDeclaration, FunctionDeclaration, ConstantDeclaration, Module, Declaration } from '~/syntax';
import DeclarationNameVisitor from '~/syntax/visitors/DeclarationNameVisitor';
import DeclarationTypeVisitor from '~/syntax/visitors/DeclarationTypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * A registry keyed by module path, then declaration name.
 * References the id of the corresponding declaration,
 * and the location of the name in code.
 */
interface NameRegistry {
    [path: string]: {
        [name: string]: {
            id: number,
            location: Location,
        }[]
    }
}

/**
 * Semantic analysis class
 */
export default class TypeChecker {
    /** The main module */
    main: Module;
    /** Registry of all module-scoped names in the program */
    names: NameRegistry = {};
    /** Registry of all module exports in the program */
    exports: NameRegistry = {};
    /** Table of all declarations by unique id */
    declarations: Declaration[] = [];
    /** list of errors gathered during type checking */
    errors: TypeError[] = [];
    /** Set of currently-resolving declarations for recursion tracking */
    resolving = new Set<Declaration>();

    constructor(module: Module) {
        this.main = module;
        this.names[module.location.path] = {};
        this.exports[module.location.path] =  {};
    }

    /**
     * Perform semantic analysis on the program, starting with the entry point (known as "main") module.
     * The outputted value will be a table of all modules in the program,
     * with the main module at position 0.
     */
    check() {
        // 1st pass: process all declarations, recursively traversing all modules
        this.main.visit(new DeclarationNameVisitor(this));
        // 2nd pass: analyze types of declarations, type check expressions and statements
        for (const decl of this.declarations) decl.visit(new DeclarationTypeVisitor(this));
        if (this.errors.length) {
            // if there were any errors, throw a combined one
            throw new Error(this.errors.map(e => e.message).join('\n'));
        }
        // the program is now type checked and all declarations are loaded. Return them.
        return this.declarations;
    }

    // //////////////////
    // RESOLVING TYPES //
    // //////////////////

    /**
     * Type check a declaration.
     * Do nothing if is has already been checked.
     * If it is already resolving, we have a circular dependency that can't be resolved, which is an error.
     * Otherwise, it hasn't been resolved yet, and we visit the top level of the declaration's AST.
     * If a type resolution reaches a name, it will resolve that name in place, calling either getType() or getValueType() below.
     * To prevent double resolution, we track which ones have already been resolved.
     */
    resolveType(module: Module, decl: ModuleElement<TypeDeclaration | FunctionDeclaration | ConstantDeclaration>) {
        if (decl.ast.type) return decl.ast.type; // resolved already
        if (decl.resolving) {
            // type recursion is handled in getType(), so this will only happen for recursively defined constants
            this.errors.push(new TypeCheckError(mess.CIRCULAR_DEPENDENCY, module.path, decl.ast.location));
            // set the type to Unknown so that this error only occurs once
            decl.ast.type = new TUnknown();
            return decl.ast.type;
        }
        if (decl.ast instanceof FunctionDeclaration) {
            // function declarations can be recursive, and they always contain their type right in their declaration
            decl.ast.visit(new TypeCheckVisitor(this, module));
        } else {
            // Set a flag on each declaration as we resolve it so that we can track circular dependencies
            decl.resolving = true;
            decl.ast.visit(new TypeCheckVisitor(this, module));
            decl.resolving = false;
        }
        return decl.ast.type;
    }

    /**
     * Given a module and the name of a type, get the Type instance of the type.
     * The type may exist in another module, so this method resolves imports and exports
     * to track down the actual declaration.
     * The type is also resolved here if it hasn't been already.
     */
    getType(module: Module, name: string): Optional<TType> {
        if (module.namespaces.hasOwnProperty(name)) {
            // namespaces can be present in types
            return new TNamespace(module.namespaces[name]);
        }
        const types = module.types[name];
        if (!types) return null;
        const resolved = types.map(type => {
            if (type.imported) {
                // type is imported, resolve the import to the corresponding export in the imported module
                const imp = module.imports[name];
                const importedModule = this.modules[imp.modulePath];
                const exp = importedModule.exports[imp.exportName];
                // get the type from that module, recursively so that we can handle forwarded imports
                return this.getType(importedModule, exp.valueName);
            } else {
                // the type was declared in this module, return it if it has already been type checked
                if (type.ast.type) return type.ast.type;
                // if the type is resolving, we have a recursive type, return the recursive reference because we don't have an actual type yet
                if (type.resolving) return new TRecursive(type.ast);
                // otherwise resolve it and return the resolved type
                return this.resolveType(module, type);
            }
        });
        return resolved.length === 1 ? resolved[0] : new TOverloadedGeneric(resolved);
    }

    /**
     * Given a module and the name of some value (either a function or a constant), get the Type instance of the value.
     * The value may exist in another module, so this method resolves imports and exports
     * to track down the actual declaration.
     * The type is also resolves here if it hasn't been already.
     */
    getValueType(module: Module, name: string): Optional<TType> {
        if (module.namespaces.hasOwnProperty(name)) {
            return new TNamespace(module.namespaces[name]);
        }
        const value = module.functions[name] || module.constants[name];
        if (!value) return null;
        if (value.imported) {
            // value is imported, resolve the import to the corresponding export in the imported module
            const imp = module.imports[name];
            const importedModule = this.modules[imp.moduleId];
            const exp = importedModule.exports[imp.exportName];
            // get the value from that module, recursively so that we can handle forwarded imports
            return this.getValueType(importedModule, exp.valueName);
        } else {
            // the value was declared in this module, return it if it has already been type checked
            if (value.ast.type) return value.ast.type;
            // otherwise resolve it and return the resolved type
            return this.resolveType(module, value);
        }
    }
}
