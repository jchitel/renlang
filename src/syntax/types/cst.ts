import CSTNode from '../CSTNode';
import { Token, ILocation } from '../../parser/Tokenizer';
import {
    Type, IdentifierType, PrimitiveType, ArrayType, FunctionType, ParenthesizedType, SpecificType, StructType,
    TupleType, UnionType
} from './ast';


export class STType extends CSTNode<Type> {
    choice: Token | STType;

    reduce(): Type {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'IDENT') {
                return new IdentifierType(this.choice.image, this.choice.getLocation());
            } else {
                return new PrimitiveType(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

export class STArrayType extends STType {
    baseType: STType;
    openBracketToken: Token;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayType();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}

export class STFunctionType extends STType {
    openParenToken: Token;
    paramTypes: STType[];
    closeParenToken: Token;
    fatArrowToken: Token;
    returnType: STType;

    reduce() {
        const node = new FunctionType();
        node.paramTypes = this.paramTypes.map(t => t.reduce());
        node.returnType = this.returnType.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), node.returnType.locations.self);
        return node;
    }
}

export class STParenthesizedType extends STType {
    openParenToken: Token;
    inner: STType;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedType();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class STSpecificType extends STType {
    nameToken: Token;
    typeArgList: STTypeArgList;

    reduce() {
        const node = new SpecificType();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        node.typeArgs = this.typeArgList.reduce();
        node.createAndRegisterLocation('self', node.locations.name, this.typeArgList.closeGtToken.getLocation());
        return node;
    }
}

export class STTypeArgList extends CSTNode<Type[]> {
    openLtToken: Token;
    closeGtToken: Token;
    types: STType[];

    reduce() {
        return this.types.map(t => t.reduce());
    }
}

export class STStructType extends STType {
    openBraceToken: Token;
    fields: STField[];
    closeBraceToken: Token;

    reduce() {
        const node = new StructType();
        node.fields = [];
        for (const field of this.fields) {
            const { type, name, loc } = field.reduce();
            node.fields.push({ type, name });
            node.registerLocation(`field_${name}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STField extends CSTNode<{ type: Type, name: string, loc: ILocation }> {
    typeNode: STType;
    nameToken: Token;

    reduce() {
        return {
            type: this.typeNode.reduce(),
            name: this.nameToken.image,
            loc: this.nameToken.getLocation(),
        };
    }
}

export class STTupleType extends STType {
    openParenToken: Token;
    types: STType[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleType();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class STUnionType extends STType {
    left: STType;
    vbarToken: Token;
    right: STType;

    reduce() {
        const node = new UnionType();
        // collapse the left and right types into a single list if they are union types
        const left = this.left.reduce();
        if (left instanceof UnionType) node.types = [...left.types];
        else node.types = [left];
        const right = this.right.reduce();
        if (right instanceof UnionType) node.types = [...node.types, ...right.types];
        else node.types.push(right);
        node.createAndRegisterLocation('self', left.locations.self, right.locations.self);
        return node;
    }
}
