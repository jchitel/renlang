import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { TTuple } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { SetTupleRef } from '../../runtime/instructions';


export class TupleLiteral extends Expression {
    items: Expression[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const itemTypes = [];
        for (const item of this.items) {
            itemTypes.push(item.getType(typeChecker, module, context));
        }
        return new TTuple(itemTypes);
    }

    translate(translator: Translator, func: Func) {
        const refs: number[] = [];
        for (const item of this.items) {
            refs.push(item.translate(translator, func));
        }
        return func.addRefInstruction(translator, ref => new SetTupleRef(ref, refs));
    }
}

export class STTupleLiteral extends STExpression {
    openParenToken: Token;
    items: STExpression[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
