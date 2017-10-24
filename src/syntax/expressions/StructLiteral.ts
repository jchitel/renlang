import { CSTNode } from '../Node';
import { Expression, STExpression } from './Expression';
import { Token, ILocation } from '../../parser/Tokenizer';
import { TType, TStruct } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext, { SymbolTable } from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { SetStructRef } from '../../runtime/instructions';


export class StructLiteral extends Expression {
    entries: { key: string, value: Expression }[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const fields: SymbolTable<TType> = {};
        for (const { key, value } of this.entries) {
            fields[key] = value.getType(typeChecker, module, context);
        }
        return new TStruct(fields);
    }

    translate(translator: Translator, func: Func) {
        const refs: { [key: string]: number } = {};
        for (const { key, value } of this.entries) {
            refs[key] = value.translate(translator, func);
        }
        return func.addRefInstruction(translator, ref => new SetStructRef(ref, refs));
    }
}

export class STStructLiteral extends STExpression {
    openBraceToken: Token;
    entries: STStructEntry[];
    closeBraceToken: Token;

    reduce() {
        const node = new StructLiteral();
        node.entries = [];
        for (const entry of this.entries) {
            const { key, value, loc } = entry.reduce();
            node.entries.push({ key, value });
            node.registerLocation(`key_${key}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STStructEntry extends CSTNode<{ key: string, value: Expression, loc: ILocation }> {
    keyToken: Token;
    colonToken: Token;
    value: STExpression;

    reduce() {
        return {
            key: this.keyToken.image,
            value: this.value.reduce(),
            loc: this.keyToken.getLocation(),
        };
    }
}
