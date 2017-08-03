import Module from '../runtime/Module';
import TypeCheckError from './TypeCheckError';
import * as mess from './TypeCheckerMessages';
import * as decl from '../ast/declarations';


/**
 * Semantic analysis class
 */
export default class TypeChecker {
    constructor() {
        this.modules = [];
        this.moduleCache = {};
        this.errors = [];
    }

    /**
     * Perform semantic analysis on the program, starting with the AST and file path of the
     * entry point (known as "main") module.
     * The outputted value will be a table of all modules in the program,
     * with the main module at position 0.
     */
    check(mainAst, mainModulePath) {
        // create a module for the main AST
        this.mainModule = new Module(0, mainModulePath, mainAst.reduce());
        this.modules.push(this.mainModule);
        this.moduleCache = { [mainModulePath]: 0 };
        // process all declarations, recursively traversing all modules
        this.processDeclarations(this.mainModule);
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
    processDeclarations(module) {
        for (const imp of module.ast.imports) this.processImport(module, imp);
        for (const typ of module.ast.types) this.processType(module, typ);
        for (const func of module.ast.functions) this.processFunction(module, func);
        for (const exp of module.ast.exports) this.processExport(module, exp);
    }

    /**
     * Process an import of a module.
     * This will load the imported module (if not already loaded),
     * determine the validity of each imported name,
     * and organize each imported value into the modules symbol tables.
     */
    processImport(module, imp) {
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
                return;
            }
            // verify that the alias doesn't already exist; imports always come first, so we only need to check imports
            if (module.imports[alias]) {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(alias), module.path, imp.locations[`importAlias_${name}`]));
                return;
            }
            // valid import, create an import entry linking the import to the export
            module.imports[alias] = { moduleId: imported.id, exportName: name, kind: imported.exports[name].kind, ast: imp };
            // add the value to the appropriate table with a flag indicating that it exists in another module
            switch (module.imports[alias].kind) {
                case 'type': module.types[alias] = { imported: true }; break;
                case 'func': module.functions[alias] = { imported: true }; break;
                case 'expr': module.constants[alias] = { imported: true }; break;
                default: break; // will never happen
            }
        }
    }

    /**
     * Process a type declared in a module.
     * This will determine the validity of the type name
     * and organize it into the type symbol table in the module.
     */
    processType(module, typ) {
        const name = typ.name;
        // handle name clashes
        if (module.imports[name] || module.types[name]) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, type.locations.name));
            return;
        }
        if (module.functions[name]) {
            // set the error on whichever comes last
            const [funcLoc, typeLoc] = [module.functions[name].ast.locations.name, typ.location.name];
            if (funcLoc.startLine < typeLoc.startLine || (funcLoc.startLine === typeLoc.startLine && funcLoc.startColumn < typeLoc.startColumn)) {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, typeLoc));
            } else {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, funcLoc));
            }
        }
        module.types[name] = { ast: typ };
    }

    /**
     * Process a function declared in a module.
     * This will determine the validity of the function name
     * and organize it into the function symbol table in the module.
     */
    processFunction(module, func) {
        const name = func.name;
        // handle name clashes
        if (module.imports[name] || module.functions[name]) {
            this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, func.locations.name));
            return;
        }
        if (module.types[name]) {
            // set the error on whichever comes last
            const [typeLoc, funcLoc] = [module.types[name].ast.locations.name, func.location.name];
            if (typeLoc.startLine < funcLoc.startLine || (typeLoc.startLine === funcLoc.startLine && typeLoc.startColumn < funcLoc.startColumn)) {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, funcLoc));
            } else {
                this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, typeLoc));
            }
        }
        module.functions[name] = { ast: func };
    }

    /**
     * Process an export declared in a module.
     * This will determine the validity of the export name and the exported value's name,
     * and organize the exported value into the module's symbol tables.
     */
    processExport(module, exp) {
        const { name, exportedValue } = exp;
        // exports are in their own scope (unless they are expressions, which is handled below) so we only need to check expressions
        if (module.exports[name]) {
            this.errors.push(new TypeCheckError(mess.EXPORT_CLASH(name), module.path, exp.locations.name));
            return;
        }
        // determine the kind and match it with a value
        if (exportedValue) {
            // inline export, the value will need to be added to the module
            if (exportedValue instanceof decl.TypeDeclaration) {
                module.exports[name] = { kind: 'type', valueName: exportedValue.name };
                this.processType(module, exportedValue);
            } else if (exportedValue instanceof decl.FunctionDeclaration) {
                module.exports[name] = { kind: 'func', valueName: exportedValue.name };
                this.processFunction(module, exportedValue);
            } else {
                // otherwise it's an expression, and the value is available in the module, check for name clashes
                if (module.imports[name]) {
                    this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, exp.locations.name));
                    return;
                }
                if (module.types[name]) {
                    // set the error on whichever comes last
                    const [typeLoc, expLoc] = [module.types[name].ast.locations.name, exp.location.name];
                    if (typeLoc.startLine < expLoc.startLine || (typeLoc.startLine === expLoc.startLine && typeLoc.startColumn < expLoc.startColumn)) {
                        this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, expLoc));
                    } else {
                        this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, typeLoc));
                    }
                }
                if (module.functions[name]) {
                    // set the error on whichever comes last
                    const [funcLoc, expLoc] = [module.functions[name].ast.locations.name, exp.location.name];
                    if (funcLoc.startLine < expLoc.startLine || (funcLoc.startLine === expLoc.startLine && funcLoc.startColumn < expLoc.startColumn)) {
                        this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, expLoc));
                    } else {
                        this.errors.push(new TypeCheckError(mess.NAME_CLASH(name), module.path, funcLoc));
                    }
                }
                module.exports[name] = { kind: 'expr', valueName: name };
                // expose it on a special constants table
                module.constants[name] = { ast: exportedValue };
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
                this.errors.push(new TypeCheckError(mess.NOT_DEFINED(name), module.path, exp.locations.name));
                return;
            }
        }
    }
}
