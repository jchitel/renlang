import { Visitor } from '~/syntax/visitor';
import { ModuleRoot, ImportDeclaration, ExportDeclaration, ExportForwardDeclaration, TypeDeclaration, FunctionDeclaration, ConstantDeclaration } from '~/syntax';
import { TypeChecker } from '~/typecheck/checker';
import { SyntaxType, Declaration } from '~/syntax/environment';
import resolveModule from '~/typecheck/resolver';


type ModuleNode = ModuleRoot | ImportDeclaration | ExportDeclaration | ExportForwardDeclaration | Declaration;

const isDeclaration = (node: ExportDeclaration | ExportForwardDeclaration | Declaration): node is Declaration =>
    ![SyntaxType.ExportDeclaration, SyntaxType.ExportForwardDeclaration].includes(node.syntaxType);

/**
 * This visitor is responsible for enumerating all modules and declarations in the program
 * to prepare for import and export resolution in the next pass.
 */
export const ModuleVisitor: Visitor<ModuleNode, TypeChecker> = {
    [SyntaxType.ModuleRoot]: (node: ModuleRoot, checker: TypeChecker) => {
        // process imports first to enumerate all modules
        const withImports = node.imports.reduce((c, i) => ModuleVisitor[i.syntaxType](i, c), checker);
        // process module-scoped declarations
        const withDeclarations = node.declarations
            .filter(isDeclaration)
            .reduce((c, d) => ModuleVisitor[d.syntaxType](d, c), withImports);
        // process exports last so all overloads are available
        return node.declarations
            .filter(d => !isDeclaration(d))
            .reduce((c, d) => ModuleVisitor[d.syntaxType](d, c), withDeclarations);
    },
    /**
     * An import declaration exposes an export of another module as a local name in the module
     * containing the declaration. To process it, we need to resolve the imported module path,
     * make sure that the requested export name exists, make sure that the requested alias name
     * does not clash with any already declared names, and then add the name to the module,
     * linking it to the exported declaration in the other module.
     */
    [SyntaxType.ImportDeclaration]: (node: ImportDeclaration, checker: TypeChecker) => {
        const currentModule = node.location.path;
        // resolve the module
        const importedModule = resolveModule(currentModule, node.moduleName.value);
        // invalid module path specified
        if (!importedModule) return checker.error(_ => _.noModule(node.moduleName));
        // make sure the module has been loaded
        this.loadModule(importedModule);
        // process the imports
        let tc = checker;
        for (const { importName, aliasName } of node.imports) {
            // if wildcard, process it as a namespace, not an import
            if (importName.image === '*') {
                const namespace = new ast.NamespaceDeclaration(importedModule, aliasName, node.location);
                namespace.visit(this);
                continue;
            }
            // regular import, verify that the module exports the name
            if (!this.getExport(importedModule, importName.image)) {
                tc = tc.error(_ => _.noModuleExport(node.moduleName.value, importName));
                continue;
            }
            // register the alias name to the module using the imported export
            this.link(currentModule, aliasName, importedModule, importName.image);
        }
    },
    [SyntaxType.ExportDeclaration]: (node: ExportDeclaration, checker: TypeChecker) => {
        //
    },
    [SyntaxType.ExportForwardDeclaration]: (node: ExportForwardDeclaration, checker: TypeChecker) => {
        //
    },
    [SyntaxType.TypeDeclaration]: (node: TypeDeclaration, checker: TypeChecker) => {
        //
    },
    [SyntaxType.FunctionDeclaration]: (node: FunctionDeclaration, checker: TypeChecker) => {
        //
    },
    [SyntaxType.ConstantDeclaration]: (node: ConstantDeclaration, checker: TypeChecker) => {
        //
    }
};
