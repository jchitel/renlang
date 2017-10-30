import { Statement, STStatement } from './Statement';
import { Noop } from './Noop';
import { Expression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { TType, TNever, determineGeneralType } from '../../typecheck/types';
import Module from '../../runtime/Module';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { PushScopeFrame, PopFrame } from '../../runtime/instructions';


export class Block extends Statement {
    statements: Statement[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        let returnType: TType = new TNever();
        for (const statement of this.statements) {
            if (statement instanceof Expression) {
                // types of expression statements are not used in blocks
                statement.getType(typeChecker, module, context);
            } else {
                // statements may have return types (if they are return statements or contain return statements)
                const type = statement.getType(typeChecker, module, context);
                returnType = determineGeneralType(returnType, type);
            }
        }
        return returnType;
    }

    translate(translator: Translator, func: Func) {
        func.pushScope(new PushScopeFrame());
        for (const statement of this.statements) {
            statement.translate(translator, func);
        }
        func.popScope(new PopFrame());
    }
}

export class STBlock extends STStatement {
    openBraceToken: Token;
    statements: STStatement[];
    closeBraceToken: Token;

    reduce() {
        const node = new Block();
        // filter out noops, because noops inside blocks mean nothing
        node.statements = this.statements.map(s => s.reduce()).filter(s => !(s instanceof Noop));
        // once all noops have been removed, if this is now empty, return a noop
        if (!node.statements.length) return new Noop(this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}
