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
        if (decl.choice instanceof cst.STTypeDeclaration) {
            node.types.push(reduceTypeDeclaration(decl.choice));
        } else if (decl.choice instanceof cst.STFunctionDeclaration) {
            node.functions.push(reduceFunctionDeclaration(decl.choice));
        } else {
            node.exports.push(reduceExportDeclaration(decl.choice));
        }
    }
    return node;
}

/**
 * Converts a CST import declaration to an AST import declaration
 */
export function reduceImportDeclaration(decl: cst.STImportDeclaration) {
    const node = new ast.ImportDeclaration();
    node.moduleName = decl.moduleNameToken.value;
    node.registerLocation('moduleName', decl.moduleNameToken.getLocation());
    node.importNames = {};

    if (decl.imports.choice instanceof Token) {
        // default import
        const token = decl.imports.choice;
        node.importNames.default = token.image;
        node.registerLocation('import_default', token.getLocation());
        node.registerLocation('importName_default', token.getLocation());
        node.registerLocation('importAlias_default', token.getLocation());
    } else {
        // named imports list
        const components = decl.imports.choice.importComponents
            .map(i => i.choice instanceof Token
                ? { name: i.choice, alias: i.choice }
                : { name: i.choice.importNameToken, alias: i.choice.importAliasToken });
        for (const { name, alias } of components) {
            node.importNames[name.image] = alias.image;
            node.createAndRegisterLocation(`import_${name.image}`, name.getLocation(), alias.getLocation());
            node.registerLocation(`importName_${name.image}`, name.getLocation());
            node.registerLocation(`importAlias_${name.image}`, alias.getLocation());
        }
    }
    return node;
}

export function reduceTypeDeclaration(decl: cst.STTypeDeclaration) {
    const node = new ast.TypeDeclaration();
    node.name = decl.typeNameToken.image;
    node.registerLocation('name', decl.typeNameToken.getLocation());
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
    node.name = decl.functionNameToken.image;
    node.registerLocation('name', decl.functionNameToken.getLocation());
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

export function reduceExportDeclaration(decl: cst.STExportDeclaration) {
    const node = new ast.ExportDeclaration();
    if (decl.exportName.choice instanceof Token) {
        node.name = 'default';
        node.registerLocation('name', decl.exportName.choice.getLocation());
    } else {
        node.name = decl.exportName.choice.exportNameToken.image;
        node.registerLocation('name', decl.exportName.choice.exportNameToken.getLocation());
    }
    if (decl.exportValue.choice instanceof cst.STFunctionDeclaration) {
        node.value = reduceFunctionDeclaration(decl.exportValue.choice);
    } else if (decl.exportValue.choice instanceof cst.STTypeDeclaration) {
        node.value = reduceTypeDeclaration(decl.exportValue.choice);
    } else {
        node.value = reduceExpression(decl.exportValue.choice);
    }
    node.createAndRegisterLocation('self', node.locations.name, node.value.locations.self);
    return node;
}
