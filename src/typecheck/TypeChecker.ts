import Module, { ModuleElement } from '~/runtime/Module';
import TypeCheckError from './TypeCheckError';
import * as mess from './TypeCheckerMessages';
import { STProgram } from '~/syntax/declarations/cst';
import {
    ImportDeclaration, TypeDeclaration, FunctionDeclaration, ConstantDeclaration,
    ExportDeclaration, ExportForwardDeclaration
} from '~/syntax/declarations/ast';
import { TType, TUnknown, TRecursive, TNamespace } from './types';
import { Location } from '~/parser/Tokenizer';
import { TypeCheckVisitor } from './visitors';
import reduceProgram from '~/syntax/declarations/reduce';


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
     * Helper function to add a type check error and return a resolved type at the same time.
     * Because most errors result in an unknown type, the default is TUnknown. 
     */
    pushError(message: string, modulePath: string, location: Location, resolvedType: TType = new TUnknown()) {
        this.errors.push(new TypeCheckError(message, modulePath, location));
        return resolvedType;
    }

    /**
     * Perform semantic analysis on the program, starting with the AST and file path of the
     * entry point (known as "main") module.
     * The outputted value will be a table of all modules in the program,
     * with the main module at position 0.
     */
    check(mainAst: STProgram, mainModulePath: string) {
        // create a module for the main AST
        this.mainModule = new Module(0, mainModulePath, reduceProgram(mainAst));
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
        for (const con of module.ast.constants) this.processConstant(module, con);
        for (const exp of module.ast.exports) this.processExport(module, exp);
        for (const fwd of module.ast.forwards) this.processForward(module, fwd);
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

    private resolveModule(sourceModule: Module, moduleName: string): Optional<Module> {
        // resolve the module's path
        const importPath = sourceModule.resolvePath(moduleName);
        if (!importPath) return null;
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
        return imported;
    }

    /**
     * Process an import of a module.
     * This will load the imported module (if not already loaded),
     * determine the validity of each imported name,
     * and organize each imported value into the modules symbol tables.
     */
    processImport(module: Module, imp: ImportDeclaration) {
        // resolve the module
        const imported = this.resolveModule(module, imp.moduleName);
        if (!imported) {
            // invalid module path specified
            this.errors.push(new TypeCheckError(mess.MODULE_PATH_NOT_EXIST(imp.moduleName), module.path, imp.locations.moduleName));
            return;
        }
        // process the imports
        for (const { importName, importLocation, aliasName, aliasLocation } of imp.imports) {
            // verify that the module exports the name, only if it isn't a wildcard import
            if (importName !== '*' && !imported.exports[importName]) {
                this.pushError(mess.MODULE_DOESNT_EXPORT_NAME(imp.moduleName, importName), module.path, importLocation);
                continue;
            }
            // verify that the alias doesn't already exist; imports always come first, so we only need to check imports
            if (module.imports[aliasName]) {
                this.pushError(mess.NAME_CLASH(aliasName), module.path, aliasLocation);
                continue;
            }
            // valid import, create an import entry linking the import to the export
            module.imports[aliasName] = {
                moduleId: imported.id,
                exportName: importName,
                kind: importName !== '*' ? imported.exports[importName].kind : 'namespace',
                ast: imp
            };
            // add the value to the appropriate table with a flag indicating that it exists in another module
            switch (module.imports[aliasName].kind) {
                case 'type': module.types[aliasName] = { imported: true } as ModuleElement<TypeDeclaration>; break;
                case 'func': module.functions[aliasName] = { imported: true } as ModuleElement<FunctionDeclaration>; break;
                case 'const': module.constants[aliasName] = { imported: true } as ModuleElement<ConstantDeclaration>; break;
                case 'namespace': module.namespaces[aliasName] = imported.id; break;
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
        else if (module.constants[name]) this.addNameClash(name, module.path, module.constants[name].ast.locations.name, typ.locations.name);
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
        else if (module.constants[name]) this.addNameClash(name, module.path, module.constants[name].ast.locations.name, func.locations.name);
        module.functions[name] = { ast: func } as ModuleElement<FunctionDeclaration>;
    }

    /**
     * Process a constant declared in a module.
     * This will determine the validity of the constant name
     * and organize it into the constant symbol table in the module.
     */
    processConstant(module: Module, con: ConstantDeclaration) {
        const name = con.name;
        // handle name clashed
        if (module.constants[name]) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, con.locations.name));
            return;
        }
        if (module.types[name]) this.addNameClash(name, module.path, module.types[name].ast.locations.name, con.locations.name);
        else if (module.functions[name]) this.addNameClash(name, module.path, module.functions[name].ast.locations.name, con.locations.name);
        module.constants[name] = { ast: con } as ModuleElement<ConstantDeclaration>;
    }

    /**
     * Process an export declared in a module.
     * This will determine the validity of the export name and the exported value's name,
     * and organize the exported value into the module's symbol tables.
     */
    processExport(module: Module, exp: ExportDeclaration) {
        for (const { exportName, exportNameLocation, valueName, valueNameLocation, value } of exp.exports) {
            // exports are in their own scope, so we only need to check against export names
            if (module.exports[exportName]) {
                this.pushError(mess.EXPORT_CLASH(exportName), module.path, exportNameLocation);
                continue;
            }
            // determine the kind and match it with a value
            if (value) {
                // inline export, the value will need to be added to the module, special name used for default export
                if (value instanceof TypeDeclaration) {
                    module.exports[exportName] = { kind: 'type', valueName };
                    this.processType(module, value);
                } else if (value instanceof FunctionDeclaration) {
                    module.exports[exportName] = { kind: 'func', valueName };
                    this.processFunction(module, value);
                } else {
                    module.exports[exportName] = { kind: 'const', valueName };
                    this.processConstant(module, value);
                }
            } else if (valueName) { // this will always be true if there is no inline value
                // export of existing value, get the kind from that value
                if (module.imports[valueName]) {
                    // re-export of an import, get the kind from the import
                    module.exports[exportName] = { kind: module.imports[valueName].kind, valueName: valueName };
                } else if (module.types[valueName]) {
                    module.exports[exportName] = { kind: 'type', valueName };
                } else if (module.functions[valueName]) {
                    module.exports[exportName] = { kind: 'func', valueName };
                } else if (module.constants[valueName]) {
                    module.exports[exportName] = { kind: 'const', valueName };
                } else {
                    // exporting a non-declared value
                    this.pushError(mess.VALUE_NOT_DEFINED(valueName), module.path, valueNameLocation!);
                }
            }
        }
    }

    /**
     * Process an export forward declared in a module.
     * This will determine the validity of the export name nad the import name,
     * and organize the import and export into the module's symbol tables.
     */
    processForward(module: Module, fwd: ExportForwardDeclaration) {
        // resolve the module
        const imported = this.resolveModule(module, fwd.moduleName);
        if (!imported) {
            // invalid module path specified
            this.errors.push(new TypeCheckError(mess.MODULE_PATH_NOT_EXIST(fwd.moduleName), module.path, fwd.locations.moduleName));
            return;
        }
        // process the forwards, both as an import and as an export
        for (const { importName, importLocation, exportName, exportLocation } of fwd.forwards) {
            // verify that the module exports the name, only if it is not a wildcard import
            if (importName !== '*' && !imported.exports[importName]) {
                this.pushError(mess.MODULE_DOESNT_EXPORT_NAME(fwd.moduleName, importName), module.path, importLocation);
                continue;
            }
            // verify that the export isn't already declared, only if it is not a wildcard export
            if (exportName !== '*' && module.exports[exportName]) {
                this.pushError(mess.EXPORT_CLASH(exportName), module.path, exportLocation);
                continue;
            }
            if (exportName !== '*') {
                // valid forward, create an import and export entry, use the module name and the import name as a dummy ID
                const dummyImport = `"${fwd.moduleName}"_${importName}`;
                module.imports[dummyImport] = {
                    moduleId: imported.id,
                    exportName: importName,
                    kind: importName !== '*' ? imported.exports[importName].kind : 'namespace',
                    ast: fwd
                };
                module.exports[exportName] = { kind: module.imports[dummyImport].kind, valueName: dummyImport };
            } else {
                // wildcard export, this forwards ALL exports of the forwarded module
                for (const imp of Object.keys(imported.exports)) {
                    // verify that the forward isn't already exported
                    if (module.exports[imp]) {
                        this.pushError(mess.EXPORT_CLASH(imp), module.path, exportLocation);
                        continue;
                    }
                    // valid, setup forward entries
                    const dummyImport = `"${fwd.moduleName}"_${imp}`;
                    module.imports[dummyImport] = { moduleId: imported.id, exportName: imp, kind: imported.exports[imp].kind, ast: fwd };
                    module.exports[imp] = { kind: module.imports[dummyImport].kind, valueName: dummyImport };
                }
            }
        }
    }

    private addNameClash(name: string, path: string, loc1: Location, loc2: Location) {
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
    resolveType(module: Module, decl: ModuleElement<TypeDeclaration | FunctionDeclaration | ConstantDeclaration>) {
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
        const type = module.types[name];
        if (!type) return null;
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
