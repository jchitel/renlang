import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { TType, TArray, TNever, determineGeneralType } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { SetArrayRef } from '../../runtime/instructions';


export class ArrayLiteral extends Expression {
    items: Expression[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // for all items, make sure there is one base assignable type for them all
        let baseType: TType = new TNever();
        for (const item of this.items) {
            const type = item.getType(typeChecker, module, context);
            baseType = determineGeneralType(baseType, type);
        }
        return new TArray(baseType);
    }

    translate(translator: Translator, func: Func) {
        const refs: number[] = [];
        for (const item of this.items) {
            refs.push(item.translate(translator, func));
        }
        return func.addRefInstruction(translator, ref => new SetArrayRef(ref, refs));
    }
}

export class STArrayLiteral extends STExpression {
    openBracketToken: Token;
    items: STExpression[];
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }
}
