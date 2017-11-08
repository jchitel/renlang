import * as cst from './cst';
import * as ast from './ast';
import ReducerMap from '~/syntax/ReducerMap';
import reduceExpression from '~/syntax/expressions/reduce';
import { reduceParam } from '~/syntax/declarations/reduce';


export default function reduceStatement(stmt: cst.STStatementNode) {
    return reducerMap.reduce(stmt.choice);
}

const reducerMap = new ReducerMap<cst.STStatement, ast.Statement>();

export const reduceBlock = reducerMap.add(cst.STBlock, (block): (ast.Block | ast.Noop) => {
    const node = new ast.Block();
    // filter out noops, because noops inside blocks mean nothing
    node.statements = block.statements.map(reduceStatement).filter(s => !(s instanceof ast.Noop));
    // once all noops have been removed, if this is now empty, return a noop
    if (!node.statements.length) return new ast.Noop(block.openBraceToken.getLocation(), block.closeBraceToken.getLocation());
    node.createAndRegisterLocation('self', block.openBraceToken.getLocation(), block.closeBraceToken.getLocation());
    return node;
});

export const reduceBreakStatement = reducerMap.add(cst.STBreakStatement, (stmt) => {
    const node = new ast.BreakStatement();
    if (stmt.loopNumber) {
        node.loopNumber = stmt.loopNumber.value;
        node.createAndRegisterLocation('self', stmt.breakToken.getLocation(), stmt.loopNumber.getLocation());
    } else {
        node.loopNumber = 0;
        node.registerLocation('self', stmt.breakToken.getLocation());
    }
    return node;
});

export const reduceContinueStatement = reducerMap.add(cst.STContinueStatement, (stmt) => {
    const node = new ast.ContinueStatement();
    if (stmt.loopNumber) {
        node.loopNumber = stmt.loopNumber.value;
        node.createAndRegisterLocation('self', stmt.continueToken.getLocation(), stmt.loopNumber.getLocation());
    } else {
        node.loopNumber = 0;
        node.registerLocation('self', stmt.continueToken.getLocation());
    }
    return node;
});

export const reduceDoWhileStatement = reducerMap.add(cst.STDoWhileStatement, (stmt) => {
    const node = new ast.DoWhileStatement();
    node.body = reduceStatement(stmt.body);
    node.conditionExp = reduceExpression(stmt.conditionExp);
    node.createAndRegisterLocation('self', stmt.doToken.getLocation(), stmt.closeParenToken.getLocation());
    return node;
});

export const reduceForStatement = reducerMap.add(cst.STForStatement, (stmt) => {
    const node = new ast.ForStatement();
    node.iterVar = stmt.iterVarToken.image;
    node.registerLocation('iterVar', stmt.iterVarToken.getLocation());
    node.iterableExp = reduceExpression(stmt.iterableExp);
    node.body = reduceStatement(stmt.body);
    node.createAndRegisterLocation('self', stmt.forToken.getLocation(), node.body.locations.self);
    return node;
});

export const reduceReturnStatement = reducerMap.add(cst.STReturnStatement, (stmt) => {
    const node = new ast.ReturnStatement();
    if (stmt.exp) {
        node.exp = reduceExpression(stmt.exp);
        node.createAndRegisterLocation('self', stmt.returnToken.getLocation(), node.exp.locations.self);
    } else {
        node.registerLocation('self', stmt.returnToken.getLocation());
    }
    return node;
});

export const reduceThrowStatement = reducerMap.add(cst.STThrowStatement, (stmt) => {
    const node = new ast.ThrowStatement();
    node.exp = reduceExpression(stmt.exp);
    node.createAndRegisterLocation('self', stmt.throwToken.getLocation(), node.exp.locations.self);
    return node;
});

export const reduceTryCatchStatement = reducerMap.add(cst.STTryCatchStatement, (stmt) => {
    const node = new ast.TryCatchStatement();
    node.try = reduceStatement(stmt.tryBody);
    node.catches = stmt.catches.map(c => ({
        param: reduceParam(c.param),
        body: reduceStatement(c.body),
    }));
    if (stmt.finally) node.finally = reduceStatement(stmt.finally.body);
    node.createAndRegisterLocation('self', stmt.tryToken.getLocation(), node.finally ? node.finally.locations.self : node.catches[node.catches.length - 1].body.locations.self);
    return node;
});

export const reduceWhileStatement = reducerMap.add(cst.STWhileStatement, (stmt) => {
    const node = new ast.WhileStatement();
    node.conditionExp = reduceExpression(stmt.conditionExp);
    node.body = reduceStatement(stmt.body);
    node.createAndRegisterLocation('self', stmt.whileToken.getLocation(), node.body.locations.self);
    return node;
});
