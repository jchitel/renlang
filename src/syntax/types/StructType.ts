import { CSTNode } from '../Node';
import { STType, Type } from './Type';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { Token, ILocation } from '../../parser/Tokenizer';
import { TType, TUnknown, TStruct } from '../../typecheck/types';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { NAME_CLASH } from '../../typecheck/TypeCheckerMessages';


export class StructType extends Type {
    fields: { type: Type, name: string }[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const fields: { [name: string]: TType } = {};
        for (const field of this.fields) {
            if (fields[field.name]) {
                typeChecker.errors.push(new TypeCheckError(NAME_CLASH(field.name), module.path, this.locations[`field_${field.name}`]));
                return new TUnknown();
            }
            fields[field.name] = field.type.getType(typeChecker, module, context);
            if (fields[field.name] instanceof TUnknown) {
                return new TUnknown();
            }
        }
        return new TStruct(fields);
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
