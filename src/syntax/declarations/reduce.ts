import * as cst from './cst';
import * as ast from './ast';
import { Token } from '~/parser/Tokenizer';
import { STBlock, STStatementNode } from '~/syntax/statements/cst';
import { Statement } from '~/syntax/statements/ast';
import { Expression } from '~/syntax/expressions/ast';
import reduceTypeNode from '~/syntax/types/reduce';
import reduceExpression from '~/syntax/expressions/reduce';
import reduceStatement, { reduceBlock } from '~/syntax/statements/reduce';


/**
 * Converts a CST program to an AST program
 */
export default function reduceProgram(program: cst.STProgram) {
    const node = new ast.Program();
    node.imports = program.imports.map(reduceImportDeclaration);
    for (const decl of program.declarations) {
        if (decl.choice instanceof cst.STDeclaration) {
            const reduced = reduceDeclaration(decl.choice);
            if (reduced instanceof ast.TypeDeclaration) {
                node.types.push(reduced);
            } else if (reduced instanceof ast.FunctionDeclaration) {
                node.functions.push(reduced);
            } else  {
                node.constants.push(reduced);
            } 
        } else if (decl.choice instanceof cst.STExportDeclaration) {
            node.exports.push(reduceExportDeclaration(decl.choice));
        } else {
            node.forwards.push(reduceExportForwardDeclaration(decl.choice));
        }
    }
    return node;
}

function reduceDeclaration(decl: cst.STDeclaration) {
    if (decl.choice instanceof cst.STTypeDeclaration) {
        return reduceTypeDeclaration(decl.choice);
    } else if (decl.choice instanceof cst.STFunctionDeclaration) {
        return reduceFunctionDeclaration(decl.choice);
    } else  {
        return reduceConstantDeclaration(decl.choice);
    } 
}

/**
 * Cases for import declarations:
 * - import default (import default as a local name)
 * - import list of names (import named values or wildcards as their name or an alias)
 * - import default and list of names (both of the above)
 * - import wildcard (import all names under a namespace name)
 * - import default and wildcard (import default as a name and wildcard as another)
 */
export function reduceImportDeclaration(decl: cst.STImportDeclaration) {
    const node = new ast.ImportDeclaration();
    node.moduleName = decl.moduleNameToken.value;
    node.registerLocation('moduleName', decl.moduleNameToken.getLocation());
    node.imports = [];
    // handle imports list
    const list = decl.imports.choice;
    let def: Token | undefined, wildcard: Token | undefined, wildcardAlias: Token | undefined;
    let named: (Token | cst.STImportWithAlias | cst.STWildcardImport)[] | undefined;
    if (list instanceof Token) {
        // import default
        def = list;
    } else if (list instanceof cst.STWildcardImport) {
        // import wildcard
        wildcard = list.multiplyToken;
        wildcardAlias = list.wildcardAliasToken;
    } else if (list instanceof cst.STDefaultAndWildcardImports) {
        // import default and wildcard
        def = list.defaultImportNameToken;
        wildcard = list.wildcard.multiplyToken;
        wildcardAlias = list.wildcard.wildcardAliasToken;
    } else if (list instanceof cst.STNamedImports) {
        // import named
        named = list.importComponents.map(c => c.choice);
    } else {
        // import default and named
        def = list.defaultImportNameToken;
        named = list.imports.importComponents.map(c => c.choice);
    }
    // add default forward
    if (def) {
        node.imports.push({
            importName: 'default', importLocation: def.getLocation(),
            aliasName: def.image, aliasLocation: def.getLocation(),
        });
    }
    // add wildcard forward
    if (wildcard) {
        node.imports.push({
            importName: '*', importLocation: wildcard.getLocation(),
            aliasName: wildcardAlias!.image, aliasLocation: wildcardAlias!.getLocation(),
        });
    }
    // add named forward
    if (named) {
        for (const i of named) {
            const [importName, aliasName] = (i instanceof Token) ? [i, i]
                : (i instanceof cst.STImportWithAlias) ? [i.importNameToken, i.importAliasToken]
                : [i.multiplyToken, i.wildcardAliasToken];
            node.imports.push({
                importName: importName.image, importLocation: importName.getLocation(),
                aliasName: aliasName.image, aliasLocation: aliasName.getLocation(),
            });
        }
    }
    return node;
}

export function reduceTypeDeclaration(decl: cst.STTypeDeclaration) {
    const node = new ast.TypeDeclaration();
    if (decl.typeNameToken) {
        node.name = decl.typeNameToken.image;
        node.registerLocation('name', decl.typeNameToken.getLocation());
    } else {
        node.name = '##DEFAULT';
    }
    node.typeParams = decl.typeParamList ? reduceTypeParamList(decl.typeParamList) : [];
    node.typeNode = reduceTypeNode(decl.typeNode);
    node.createAndRegisterLocation('self', decl.typeToken.getLocation(), node.typeNode.locations.self);
    return node;
}

export function reduceTypeParamList(list: cst.STTypeParamList) {
    const nodeList = [];
    for (const param of list.typeParams) {
        const paramNode = new ast.TypeParam();
        let start = param.nameToken.getLocation();
        let end = start;
        if (param.varianceOp) {
            const loc = param.varianceOp.choice.getLocation();
            paramNode.varianceOp = param.varianceOp.choice.image;
            paramNode.registerLocation('variance', loc);
            start = loc;
        }
        paramNode.name = param.nameToken.image;
        paramNode.registerLocation('name', param.nameToken.getLocation());
        if (param.typeConstraint) {
            const opLoc = param.typeConstraint.colonToken.getLocation();
            paramNode.typeConstraint = reduceTypeNode(param.typeConstraint.constraintType);
            const loc = opLoc.merge(paramNode.typeConstraint.locations.self);
            paramNode.registerLocation('constraint', loc);
            end = loc;
        }
        paramNode.createAndRegisterLocation('self', start, end);
        nodeList.push(paramNode);
    }
    return nodeList;
}

export function reduceFunctionDeclaration(decl: cst.STFunctionDeclaration) {
    const node = new ast.FunctionDeclaration();
    if (decl.functionNameToken) {
        node.name = decl.functionNameToken.image;
        node.registerLocation('name', decl.functionNameToken.getLocation());
    } else {
        node.name = '##DEFAULT';
    }
    node.returnType = reduceTypeNode(decl.returnType);
    node.typeParams = decl.typeParamList ? reduceTypeParamList(decl.typeParamList) : [];
    node.params = decl.paramsList.params.map(p => reduceParam(p));
    node.body = reduceFunctionBody(decl.functionBody);
    node.createAndRegisterLocation('self', node.locations.name, node.body.locations.self);
    return node;
}

export function reduceParam(param: cst.STParam) {
    const node = new ast.Param();
    node.typeNode = reduceTypeNode(param.typeNode);
    node.name = param.nameToken.image;
    node.registerLocation('name', param.nameToken.getLocation());
    return node;
}

export function reduceFunctionBody(body: cst.STFunctionBody): Statement | Expression {
    if (body.choice instanceof STBlock) {
        return reduceBlock(body.choice);
    } else if (body.choice instanceof STStatementNode) {
        return reduceStatement(body.choice);
    } else {
        return reduceExpression(body.choice);
    }
}

export function reduceConstantDeclaration(decl: cst.STConstantDeclaration) {
    const node = new ast.ConstantDeclaration();
    if (decl.identToken) {
        node.name = decl.identToken.image;
        node.registerLocation('name', decl.identToken.getLocation());
    } else {
        node.name = '##DEFAULT';
    }
    node.value = reduceExpression(decl.exp);
    node.createAndRegisterLocation('self', node.locations.name, node.value.locations.self);
    return node;
}

/**
 * Cases for export declarations:
 * - default export (export something as default)
 *   - export name (export module-scope value as default)
 *   - export declaration (export inline named value as default)
 *   - export anonymous declaration (export inlined anonymous value as default)
 * - named export (export something under a specific name)
 *   - export declaration (export inline named value as that name)
 *   - export names (export module-scope value(s) as their own name or new name)
 */
export function reduceExportDeclaration(decl: cst.STExportDeclaration) {
    const node = new ast.ExportDeclaration();
    node.exports = [];
    if (decl.choice instanceof cst.STDefaultExportDeclaration) {
        const exp = { exportName: 'default', exportNameLocation: decl.choice.defaultToken.getLocation() };
        const value = decl.choice.value;
        if (value.choice instanceof Token) {
            node.exports.push({ valueName: value.choice.image, valueNameLocation: value.choice.getLocation(), ...exp });
        } else if (value.choice instanceof cst.STDeclaration) {
            const v = reduceDeclaration(value.choice);
            // anonymous declarations have no name, and thus no name location
            const loc = v.name === '##DEFAULT' ? exp.exportNameLocation : v.locations.name;
            node.exports.push({ valueName: v.name, valueNameLocation: loc, value: v, ...exp });
        }
    } else {
        const value = decl.choice.value;
        if (value.choice instanceof cst.STDeclaration) {
            const v = reduceDeclaration(value.choice);
            node.exports.push({
                exportName: v.name, exportNameLocation: v.locations.name,
                valueName: v.name, valueNameLocation: v.locations.name, value: v
            });
        } else {
            for (const e of value.choice.exports) {
                if (e.choice instanceof Token) {
                    node.exports.push({
                        exportName: e.choice.image, exportNameLocation: e.choice.getLocation(),
                        valueName: e.choice.image, valueNameLocation: e.choice.getLocation(),
                    });
                } else {
                    node.exports.push({
                        exportName: e.choice.importAliasToken.image, exportNameLocation: e.choice.importAliasToken.getLocation(),
                        valueName: e.choice.importNameToken.image, valueNameLocation: e.choice.importNameToken.getLocation(),
                    });
                }
            }
        }
    }
    return node;
}

/**
 * Cases for forward declarations:
 * - declaration is default export (forwarding something as default)
 *   - declaration has suffix (forwarding non-default as default)
 *     - suffix is * (forwarding wildcard as default)
 *     - suffix is name (forwarding specific name as default)
 *   - no suffix (forwarding default as default)
 * - declaration is named export (forwarding something as name)
 *   - forwards is * (forwarding all from wildcard)
 *   - forwards is import list (forwarding normal import as name)
 *     - list is name (forwarding default as name)
 *     - list is wildcard import (forwarding wildcard as name)
 *     - list is name and wildcard (forwarding default as name and wildcard as name)
 *     - list is named imports list (forwarding names/wildcards as names)
 *     - list is name and list (forward default as name and names/wildcards as names)
 */
export function reduceExportForwardDeclaration(decl: cst.STExportForwardDeclaration) {
    const node = new ast.ExportForwardDeclaration();
    node.moduleName = decl.choice.moduleNameToken.value;
    node.registerLocation('moduleName', decl.choice.moduleNameToken.getLocation());
    node.forwards = [];
    if (decl.choice instanceof cst.STDefaultExportForwardDeclaration) {
        // forwarding something from another module as default of this module
        const exp = { exportName: 'default', exportLocation: decl.choice.defaultToken.getLocation() };
        if (decl.choice.suffix) {
            const f = decl.choice.suffix.forwards.choice;
            node.forwards.push(f instanceof Token
                // import wildcard
                ? { importName: '*', importLocation: f.getLocation(), ...exp }
                // import name
                : { importName: f.forwardNameToken.image, importLocation: f.forwardNameToken.getLocation(), ...exp });
        } else {
            // import default
            node.forwards.push({ importName: 'default', importLocation: decl.choice.defaultToken.getLocation(), ...exp });
        }
    } else {
        // forwarding something from another module as named from this module
        const forwards = decl.choice.forwards.choice;
        if (forwards instanceof cst.STImportList) {
            let defaultExport: Token | undefined, wildcard: Token | undefined, wildcardExport: Token | undefined;
            let named: (Token | cst.STImportWithAlias | cst.STWildcardImport)[] | undefined;
            if (forwards.choice instanceof Token) {
                // import default
                defaultExport = forwards.choice;
            } else if (forwards.choice instanceof cst.STWildcardImport) {
                // import wildcard
                wildcard = forwards.choice.multiplyToken;
                wildcardExport = forwards.choice.wildcardAliasToken;
            } else if (forwards.choice instanceof cst.STDefaultAndWildcardImports) {
                // import default and wildcard
                defaultExport = forwards.choice.defaultImportNameToken;
                wildcard = forwards.choice.wildcard.multiplyToken;
                wildcardExport = forwards.choice.wildcard.wildcardAliasToken;
            } else if (forwards.choice instanceof cst.STNamedImports) {
                // import named
                named = forwards.choice.importComponents.map(c => c.choice);
            } else {
                // import default and named
                defaultExport = forwards.choice.defaultImportNameToken;
                named = forwards.choice.imports.importComponents.map(c => c.choice);
            }
            // add default forward
            if (defaultExport) {
                node.forwards.push({
                    importName: 'default', importLocation: defaultExport.getLocation(),
                    exportName: defaultExport.image, exportLocation: defaultExport.getLocation(),
                });
            }
            // add wildcard forward
            if (wildcard) {
                node.forwards.push({
                    importName: '*', importLocation: wildcard.getLocation(),
                    exportName: wildcardExport!.image, exportLocation: wildcardExport!.getLocation(),
                });
            }
            // add named forward
            if (named) {
                for (const i of named) {
                    const [importName, exportName] = (i instanceof Token) ? [i, i]
                        : (i instanceof cst.STImportWithAlias) ? [i.importNameToken, i.importAliasToken]
                        : [i.multiplyToken, i.wildcardAliasToken];
                    node.forwards.push({
                        importName: importName.image, importLocation: importName.getLocation(),
                        exportName: exportName.image, exportLocation: exportName.getLocation(),
                    });
                }
            }
        } else {
            // wildcard to wildcard
            node.forwards.push({
                importName: '*', importLocation: forwards.getLocation(),
                exportName: '*', exportLocation: forwards.getLocation(),
            });
        }
    }
    return node;
}
