import Module, { ModuleElement } from '../runtime/Module';
import TypeCheckError from './TypeCheckError';
import * as mess from './TypeCheckerMessages';
import { STProgram, ImportDeclaration, TypeDeclaration, FunctionDeclaration, ExportDeclaration } from '../syntax/declarations';
import { TType, TUnknown, TRecursive } from './types';
import { ILocation } from '../parser/Tokenizer';


export type SymbolTable<T> = { [symbol: string]: T };

/**
 * Semantic analysis class
 */
export default class TypeChecker {
    // Module table
    modules: Module[];
    moduleCache: { [path: string]: number };
    // list of errors gathered during type checking
    errors: TypeCheckError[];
    // pointer to the main module
    mainModule: Module;

    constructor() {
        // array of all modules loaded in the application, where each index is the id of the module
        this.modules = [];
        // object mapping absolute paths of modules to the corresponding module id
        this.moduleCache = {};
        // list of errors to emit in the event of type check errors
        this.errors = [];
    }

    /**
     * Perform semantic analysis on the program, starting with the AST and file path of the
     * entry point (known as "main") module.
     * The outputted value will be a table of all modules in the program,
     * with the main module at position 0.
     */
    check(mainAst: STProgram, mainModulePath: string) {
        // create a module for the main AST
        this.mainModule = new Module(0, mainModulePath, mainAst.reduce());
        this.modules.push(this.mainModule);
        this.moduleCache = { [mainModulePath]: 0 };
        // process all declarations, recursively traversing all modules
        this.processDeclarations(this.mainModule);
        // analyze types of declarations, type check expressions and statements
        this.resolveTypes();
        if (this.errors.length) {
            // if there were any errors, throw a combined one
            throw new Error(this.errors.map(e => e.message).join('\n'));
        }
        // the program is now type checked and all modules are loaded. Return them.
        return this.modules;
    }

    /**
     * Process all name declarations in a module.
     * This will organize all imports and exports of a module.
     * It will also organize all available names in the module into one of three categories:
     * types, functions, or constants.
     * When this is done, all modules in the environment will be loaded,
     * and all available names in each module will be available for access.
     */
    processDeclarations(module: Module) {
        for (const imp of module.ast.imports) this.processImport(module, imp);
        for (const typ of module.ast.types) this.processType(module, typ);
        for (const func of module.ast.functions) this.processFunction(module, func);
        for (const exp of module.ast.exports) this.processExport(module, exp);
    }

    /**
     * Traverse each module, resolving the type of every declaration
     * and performing type checking for all statements and expressions.
     * Ignore imported declarations because they don't exist in the module.
     * Those will be resolved as they are used.
     */
    resolveTypes() {
        for (const module of this.modules) {
            // types, functions, and constants need to be resolved
            const toResolve = [...Object.values(module.types), ...Object.values(module.functions), ...Object.values(module.constants)].filter(t => !t.imported);
            for (const decl of toResolve) {
                this.resolveType(module, decl);
            }
        }
    }

    // //////////////////////////
    // PROCESSING DECLARATIONS //
    // //////////////////////////

    /**
     * Process an import of a module.
     * This will load the imported module (if not already loaded),
     * determine the validity of each imported name,
     * and organize each imported value into the modules symbol tables.
     */
    processImport(module: Module, imp: ImportDeclaration) {
        // resolve the module's path
        const importPath = module.resolvePath(imp.moduleName);
        if (!importPath) {
            // invalid module path specified
            this.errors.push(new TypeCheckError(mess.MODULE_PATH_NOT_EXIST(imp.moduleName), module.path, imp.locations.moduleName));
            return;
        }
        // load the module. if it has been loaded already, get it from the cache
        let imported;
        if (!this.moduleCache[importPath]) {
            imported = new Module(this.modules.length, importPath);
            this.modules.push(imported);
            this.moduleCache[importPath] = imported.id;
            // this is a new module, so we need to process it before we can proceed
            this.processDeclarations(imported);
        } else {
            imported = this.modules[this.moduleCache[importPath]];
        }
        // process the import names
        for (const [name, alias] of Object.entries(imp.importNames)) {
            // verify that the module exports the name
            if (!imported.exports[name]) {
                this.errors.push(new TypeCheckError(mess.MODULE_DOESNT_EXPORT_NAME(imp.moduleName, name), module.path, imp.locations[`importName_${name}`]));
                continue;
            }
            // verify that the alias doesn't already exist; imports always come first, so we only need to check imports
            if (module.imports[alias]) {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(alias), module.path, imp.locations[`importAlias_${name}`]));
                continue;
            }
            // valid import, create an import entry linking the import to the export
            module.imports[alias] = { moduleId: imported.id, exportName: name, kind: imported.exports[name].kind, ast: imp };
            // add the value to the appropriate table with a flag indicating that it exists in another module
            switch (module.imports[alias].kind) {
                case 'type': module.types[alias] = { imported: true } as ModuleElement<TypeDeclaration>; break;
                case 'func': module.functions[alias] = { imported: true } as ModuleElement<FunctionDeclaration>; break;
                case 'expr': module.constants[alias] = { imported: true } as ModuleElement<ExportDeclaration>; break;
            }
        }
    }

    /**
     * Process a type declared in a module.
     * This will determine the validity of the type name
     * and organize it into the type symbol table in the module.
     */
    processType(module: Module, typ: TypeDeclaration) {
        const name = typ.name;
        // handle name clashes
        if (module.types[name]) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, typ.locations.name));
            return;
        }
        if (module.functions[name]) this.addNameClash(name, module.path, module.functions[name].ast.locations.name, typ.locations.name);
        module.types[name] = { ast: typ } as ModuleElement<TypeDeclaration>;
    }

    /**
     * Process a function declared in a module.
     * This will determine the validity of the function name
     * and organize it into the function symbol table in the module.
     */
    processFunction(module: Module, func: FunctionDeclaration) {
        const name = func.name;
        // handle name clashes
        if (module.functions[name]) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, func.locations.name));
            return;
        }
        if (module.types[name]) this.addNameClash(name, module.path, module.types[name].ast.locations.name, func.locations.name);
        module.functions[name] = { ast: func } as ModuleElement<FunctionDeclaration>;
    }

    /**
     * Process an export declared in a module.
     * This will determine the validity of the export name and the exported value's name,
     * and organize the exported value into the module's symbol tables.
     */
    processExport(module: Module, exp: ExportDeclaration) {
        const { name, value } = exp;
        // exports are in their own scope (unless they are expressions, which is handled below) so we only need to check expressions
        if (module.exports[name]) {
            this.errors.push(new TypeCheckError(mess.EXPORT_CLASH(name), module.path, exp.locations.name));
            return;
        }
        // determine the kind and match it with a value
        if (value) {
            // inline export, the value will need to be added to the module
            if (value instanceof TypeDeclaration) {
                module.exports[name] = { kind: 'type', valueName: value.name };
                this.processType(module, value);
            } else if (value instanceof FunctionDeclaration) {
                module.exports[name] = { kind: 'func', valueName: value.name };
                this.processFunction(module, value);
            } else {
                // otherwise it's an expression, and the value is available in the module, check for name clashes
                if (module.constants[name]) {
                    this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, exp.locations.name));
                    return;
                }
                if (module.types[name]) this.addNameClash(name, module.path, module.types[name].ast.locations.name, exp.locations.name);
                else if (module.functions[name]) this.addNameClash(name, module.path, module.functions[name].ast.locations.name, exp.locations.name);
                module.exports[name] = { kind: 'expr', valueName: name };
                // expose it on a special constants table
                module.constants[name] = { ast: exp } as ModuleElement<ExportDeclaration>;
            }
        } else {
            // it exports some already declared value, get the kind from that value
            if (module.imports[name]) {
                // we are re-exporting an import, get the kind from the import
                module.exports[name] = { kind: module.imports[name].kind, valueName: name };
            } else if (module.types[name]) {
                module.exports[name] = { kind: 'type', valueName: name };
            } else if (module.functions[name]) {
                module.exports[name] = { kind: 'func', valueName: name };
            } else {
                // exporting a non-declared value
                this.errors.push(new TypeCheckError(mess.VALUE_NOT_DEFINED(name), module.path, exp.locations.name));
            }
        }
    }

    addNameClash(name: string, path: string, loc1: ILocation, loc2: ILocation) {
        // set the error on whichever comes last
        if (loc1.startLine < loc2.startLine || (loc1.startLine === loc2.startLine && loc1.startColumn < loc2.startColumn)) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), path, loc2));
        } else {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), path, loc1));
        }
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
    resolveType(module: Module, decl: ModuleElement<TypeDeclaration | FunctionDeclaration | ExportDeclaration>) {
        if (decl.ast.type) return decl.ast.type; // resolved already
        if (decl.resolving) {
            // type recursion is handled in getType(), so this will only happen for recursively defined constants
            this.errors.push(new TypeCheckError(mess.CIRCULAR_DEPENDENCY, module.path, decl.ast.locations.self));
            // set the type to Unknown so that this error only occurs once
            decl.ast.type = new TUnknown();
            return decl.ast.type;
        }
        if (decl.ast instanceof FunctionDeclaration) {
            // function declarations can be recursive, and they always contain their type right in their declaration
            decl.ast.resolveType(this, module);
        } else {
            // Set a flag on each declaration as we resolve it so that we can track circular dependencies
            decl.resolving = true;
            decl.ast.resolveType(this, module);
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
    getType(module: Module, name: string): TType {
        const type = module.types[name];
        if (type.imported) {
            // type is imported, resolve the import to the corresponding export in the imported module
            const imp = module.imports[name];
            const importedModule = this.modules[imp.moduleId];
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
    }

    /**
     * Given a module and the name of some value (either a function or a constant), get the Type instance of the value.
     * The value may exist in another module, so this method resolves imports and exports
     * to track down the actual declaration.
     * The type is also resolves here if it hasn't been already.
     */
    getValueType(module: Module, name: string): TType | null {
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
