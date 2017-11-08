import * as cst from './cst';
import * as ast from './ast';
import { Token } from '~/parser/Tokenizer';
import ReducerMap from '~/syntax/ReducerMap';


export default function reduceType(type: cst.STTypeNode) {
    if (type.choice instanceof Token) {
        if (type.choice.type === 'IDENT') {
            return new ast.IdentifierType(type.choice.image, type.choice.getLocation());
        } else {
            return new ast.PrimitiveType(type.choice.image, type.choice.getLocation());
        }
    } else {
        return reducerMap.reduce(type.choice);
    }
}

/**
 * While we are limited by the constraints of TypeScript,
 * this is a simple map from CST type class to a corresponding function
 * that converts it to an AST node.
 */
const reducerMap = new ReducerMap<cst.STType, ast.Type>();

export const reduceArrayType = reducerMap.add(cst.STArrayType, (type) => {
    const node = new ast.ArrayType();
    node.baseType = reduceType(type.baseType);
    node.createAndRegisterLocation('self', node.baseType.locations.self, type.closeBracketToken.getLocation());
    return node;
});

export const reduceFunctionType = reducerMap.add(cst.STFunctionType, (type) => {
    const node = new ast.FunctionType();
    node.paramTypes = type.paramTypes.map(reduceType);
    node.returnType = reduceType(type.returnType);
    node.createAndRegisterLocation('self', type.openParenToken.getLocation(), node.returnType.locations.self);
    return node;
});

export const reduceParenthesizedType = reducerMap.add(cst.STParenthesizedType, (type) => {
    const node = new ast.ParenthesizedType();
    node.inner = reduceType(type.inner);
    node.createAndRegisterLocation('self', type.openParenToken.getLocation(), type.closeParenToken.getLocation());
    return node;
});

export const reduceSpecificType = reducerMap.add(cst.STSpecificType, (type) => {
    const node = new ast.SpecificType();
    node.name = type.nameToken.image;
    node.registerLocation('name', type.nameToken.getLocation());
    node.typeArgs = reduceTypeArgList(type.typeArgList);
    node.createAndRegisterLocation('self', node.locations.name, type.typeArgList.closeGtToken.getLocation());
    return node;
});

export function reduceTypeArgList(list: cst.STTypeArgList) {
    return list.types.map(reduceType);
}

export const reduceStructType = reducerMap.add(cst.STStructType, (type) => {
    const node = new ast.StructType();
    node.fields = [];
    for (const field of type.fields) {
        const name = field.nameToken.image;
        node.fields.push({ type: reduceType(field.typeNode), name });
        node.registerLocation(`field_${name}`, field.nameToken.getLocation());
    }
    node.createAndRegisterLocation('self', type.openBraceToken.getLocation(), type.closeBraceToken.getLocation());
    return node;
});

export const reduceTupleType = reducerMap.add(cst.STTupleType, (type) => {
    const node = new ast.TupleType();
    node.types = type.types.map(reduceType);
    node.createAndRegisterLocation('self', type.openParenToken.getLocation(), type.closeParenToken.getLocation());
    return node;
});

export const reduceUnionType = reducerMap.add(cst.STUnionType, (type) => {
    const node = new ast.UnionType();
    // collapse the left and right types into a single list if they are union types
    const left = reduceType(type.left);
    if (left instanceof ast.UnionType) node.types = [...left.types];
    else node.types = [left];
    const right = reduceType(type.right);
    if (right instanceof ast.UnionType) node.types = [...node.types, ...right.types];
    else node.types.push(right);
    node.createAndRegisterLocation('self', left.locations.self, right.locations.self);
    return node;
});
