import * as cst from './cst';
import * as ast from './ast';
import { STParam } from '../declarations/cst';
import { reduceParam, reduceFunctionBody } from '../declarations/reduce';
import { reduceTypeArgList } from '../types/reduce';
import ReducerMap from '../ReducerMap';
import { Token } from '../../parser/Tokenizer';
import { getOperatorMetadata, verifyMultiOperator } from '../../runtime/operators';


export default function reduceExpression(exp: cst.STExpressionNode) {
    if (exp.choice instanceof Token) {
        if (exp.choice.type === 'INTEGER_LITERAL') {
            return new ast.IntegerLiteral(exp.choice.value as number, exp.choice.getLocation());
        } else if (exp.choice.type === 'FLOAT_LITERAL') {
            return new ast.FloatLiteral(exp.choice.value as number, exp.choice.getLocation());
        } else if (exp.choice.type === 'CHAR_LITERAL') {
            return new ast.CharLiteral(exp.choice.value as string, exp.choice.getLocation());
        } else if (exp.choice.type === 'STRING_LITERAL') {
            return new ast.StringLiteral(exp.choice.value as string, exp.choice.getLocation());
        } else if (['TRUE', 'FALSE'].includes(exp.choice.type)) {
            return new ast.BoolLiteral(exp.choice.image, exp.choice.getLocation());
        } else {
            return new ast.IdentifierExpression(exp.choice.image, exp.choice.getLocation());
        }
    } else {
        return reducerMap.reduce(exp.choice);
    }
}

/**
 * While we are limited by the constraints of TypeScript,
 * this is a simple map from CST expression class to a corresponding function
 * that converts it to an AST node.
 */
const reducerMap = new ReducerMap<cst.STExpression, ast.Expression>();

export const reduceArrayAccess = reducerMap.add(cst.STArrayAccess, (exp) => {
    const node = new ast.ArrayAccess();
    node.target = reduceExpression(exp.target);
    node.indexExp = reduceExpression(exp.indexExp);
    node.createAndRegisterLocation('self', node.target.locations.self, exp.closeBracketToken.getLocation());
    return node;
});

export const reduceArrayLiteral = reducerMap.add(cst.STArrayLiteral, (exp) => {
    const node = new ast.ArrayLiteral();
    node.items = exp.items.map(reduceExpression);
    node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
    return node;
});

/**
 * Reduction for binary expressions is more complex because we need to handle
 * operator precedence and associativity rules.
 */
export const reduceBinaryExpression = reducerMap.add(cst.STBinaryExpression, (exp) => {
    // handle < and > problems
    exp.operatorToken = verifyMultiOperator(exp.operatorToken);
    // convert the current binary expression tree to a list
    const items = binaryExpressionToList(exp);
    // Shunting-yard algorithm to resolve precedence
    const expStack: ast.Expression[] = [];
    const operStack: Token[] = [];
    while (items.length) {
        const item = items.shift() as (ast.Expression | Token);
        if (item instanceof ast.Expression) {
            expStack.push(item);
        } else {
            while (operStack.length && shouldPopOperator(item, operStack[operStack.length - 1])) {
                const exp = new ast.BinaryExpression();
                exp.right = expStack.pop() as ast.Expression;
                exp.left = expStack.pop() as ast.Expression;
                const oper = operStack.pop() as Token;
                exp.symbol = oper.image;
                exp.registerLocation('oper', oper.getLocation());
                exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
                expStack.push(exp);
            }
            operStack.push(item);
        }
    }
    // empty the operator stack
    while (operStack.length) {
        const exp = new ast.BinaryExpression();
        exp.right = expStack.pop() as ast.Expression;
        exp.left = expStack.pop() as ast.Expression;
        const oper = operStack.pop() as Token;
        exp.symbol = oper.image;
        exp.registerLocation('oper', oper.getLocation());
        exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
        expStack.push(exp);
    }
    // final expression tree is the only element left on the exp stack
    return expStack[0];
});

function shouldPopOperator(nextToken: Token, stackToken: Token) {
    const nextOper = getOperatorMetadata(nextToken.image, 'infix') as { precedence: number };
    const stackOper = getOperatorMetadata(stackToken.image, 'infix') as { precedence: number, associativity: string };
    return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
}

function binaryExpressionToList(exp: cst.STBinaryExpression) {
    const items = [];
    // the tree is left-associative, so we assemble the list from right to left
    let right = reduceExpression(exp.right);
    let operToken = exp.operatorToken;
    // if the left is binary, don't reduce it because that's what we're doing
    let left = exp.left.choice instanceof cst.STBinaryExpression ? exp.left.choice : reduceExpression(exp.left);
    while (true) {
        items.unshift(right);
        items.unshift(operToken);
        if (left instanceof cst.STBinaryExpression) {
            right = reduceExpression(left.right);
            operToken = left.operatorToken;
            left = left.left.choice instanceof cst.STBinaryExpression ? left.left.choice : reduceExpression(left.left);
        } else {
            items.unshift(left);
            break;
        }
    }
    return items;
}

export const reduceFieldAccess = reducerMap.add(cst.STFieldAccess, (exp) => {
    const node = new ast.FieldAccess();
    node.target = reduceExpression(exp.target);
    node.field = exp.fieldNameToken.image;
    node.registerLocation('field', exp.fieldNameToken.getLocation());
    node.createAndRegisterLocation('self', node.target.locations.self, node.locations.field);
    return node;
});

export const reduceFunctionApplication = reducerMap.add(cst.STFunctionApplication, (exp) => {
    const node = new ast.FunctionApplication();
    node.target = reduceExpression(exp.target);
    if (exp.typeArgList) node.typeArgs = reduceTypeArgList(exp.typeArgList);
    node.args = exp.args.map(reduceExpression);
    node.createAndRegisterLocation('self', node.target.locations.self, exp.closeParenToken.getLocation());
    return node;
});

export const reduceIfElseExpression = reducerMap.add(cst.STIfElseExpression, (exp) => {
    const node = new ast.IfElseExpression();
    node.condition = reduceExpression(exp.condition);
    node.consequent = reduceExpression(exp.consequent);
    node.alternate = reduceExpression(exp.alternate);
    node.createAndRegisterLocation('self', exp.ifToken.getLocation(), node.alternate.locations.self);
    return node;
});

export const reduceLambdaExpression = reducerMap.add(cst.STLambdaExpression, (exp) => {
    const node = new ast.LambdaExpression();
    const params = exp.shorthandParam ? [new cst.STLambdaParam({ choice: exp.shorthandParam })] : exp.params;
    node.params = params.map(p => {
        if (p.choice instanceof STParam) return reduceParam(p.choice);
        const node = new ast.LambdaParam();
        node.name = p.choice.image;
        node.registerLocation('name', p.choice.getLocation());
        return node;
    });
    node.body = reduceFunctionBody(exp.functionBody);
    // lambda expression start location is complicated because it can either be a '(' or a param name
    node.createAndRegisterLocation('self',
        this.openParenToken ? this.openParenToken.getLocation() : node.params[0].locations.name,
        node.body.locations.self);
    return node;
});

export const reduceParenthesizedExpression = reducerMap.add(cst.STParenthesizedExpression, (exp) => {
    const node = new ast.ParenthesizedExpression();
    node.inner = reduceExpression(exp.inner);
    node.createAndRegisterLocation('self', exp.openParenToken.getLocation(), exp.closeParenToken.getLocation());
    return node;
});

export const reduceStructLiteral = reducerMap.add(cst.STStructLiteral, (exp) => {
    const node = new ast.StructLiteral();
    node.entries = [];
    for (const entry of exp.entries) {
        const key = entry.keyToken.image;
        node.entries.push({ key, value: reduceExpression(entry.value) });
        node.registerLocation(`key_${key}`, entry.keyToken.getLocation());
    }
    node.createAndRegisterLocation('self', exp.openBraceToken.getLocation(), exp.closeBraceToken.getLocation());
    return node;
});

export const reduceTupleLiteral = reducerMap.add(cst.STTupleLiteral, (exp) => {
    const node = new ast.TupleLiteral();
    node.items = exp.items.map(reduceExpression);
    node.createAndRegisterLocation('self', exp.openParenToken.getLocation(), exp.closeParenToken.getLocation());
    return node;
});

function reduceUnaryExpression(exp: cst.STUnaryExpression) {
    // verify that any multiple operator tokens are valid
    exp.operatorToken = verifyMultiOperator(exp.operatorToken);
    const node = new ast.UnaryExpression();
    node.symbol = exp.operatorToken.image;
    node.registerLocation('oper', exp.operatorToken.getLocation());
    node.target = reduceExpression(exp.target);
    return node;
}

export const reducePrefixExpression = reducerMap.add(cst.STPrefixExpression, (exp) => {
    const node = reduceUnaryExpression(exp);
    node.createAndRegisterLocation('self', node.locations.oper, node.target.locations.self);
    return node;
});

export const reducePostfixExpression = reducerMap.add(cst.STPostfixExpression, (exp) => {
    const node = reduceUnaryExpression(exp);
    node.createAndRegisterLocation('self', node.target.locations.self, node.locations.oper);
    return node;
});

export const reduceVarDeclaration = reducerMap.add(cst.STVarDeclaration, (exp) => {
    const node = new ast.VarDeclaration();
    node.name = exp.varIdentToken.image;
    node.registerLocation('name', exp.varIdentToken.getLocation());
    node.initExp = reduceExpression(exp.initialValue);
    node.createAndRegisterLocation('self', node.locations.name, node.initExp.locations.self);
    return node;
});
