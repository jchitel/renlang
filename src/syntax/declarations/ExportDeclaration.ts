import { Location, Token, TokenType } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal, exp, ParseResult } from '~/parser/Parser';
import { Declaration, NonImportDeclaration } from './Program';
import { NameAlias } from './ImportDeclaration';


/**
 * ExportDeclaration ::= DefaultExportDeclaration | NamedExportDeclaration
 * 
 * We implemented this using the inheritance model because it ended up being simpler that way.
 */
@nonTerminal({ abstract: true, implements: NonImportDeclaration })
export abstract class ExportDeclaration extends NonImportDeclaration {
    /**
     * Cases:
     * - Default export of a name (export name = default, value name = value name, NO value)
     * - Named export of a name (export name AND value name = value name, NO value)
     * - Named export with an alias (export name = alias, value name = value name, NO value)
     * - Default export of a named value (export name = default, value name = name from value, value = value)
     * - Default export of an anonymous value (export name = default, NO value name, value = value)
     * - Named export of a named value (export name AND value name = name from value, value = value)
     */
    exports: {
        // export name is always present
        exportName: string,
        exportNameLocation: Location,
        // value name is always present (##DEFAULT for anonymous default exports)
        valueName: string,
        valueNameLocation: Location,
        // value is not present for exports of existing names
        value?: Declaration,
    }[] = [];
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitExportDeclaration(this);
    }

    protected addExport(exportName: string, exportNameLocation: Location, valueName: string, valueNameLocation: Location, value?: Declaration) {
        this.exports.push({ exportName, exportNameLocation, valueName, valueNameLocation, value });
    }
}

@nonTerminal({ implements: ExportDeclaration })
export class DefaultExportDeclaration extends ExportDeclaration {
    @parser('export') setExportToken() {}

    @parser('default')
    setDefaultToken(token: Token) {
        this.registerLocation('default', token.getLocation());
    }

    @parser([Declaration, TokenType.IDENT], { definite: true })
    setValue(value: Declaration | Token) {
        if (value instanceof Token) {
            super.addExport('default', this.locations.default, value.image, value.getLocation());
        } else {
            // anonymous declarations have no name, and thus no name location
            const loc = value.name ? value.locations.name : this.locations.default;
            super.addExport('default', this.locations.default, value.name, loc, value);
        }
    }
}

/**
 * NamedExports ::= LBRACE (IDENT | ImportAlias) (+ sep COMMA) RBRACE
 */
const NamedExports = {
    '{': exp(TokenType.LBRACE, { definite: true }),
    exports: exp([NameAlias, TokenType.IDENT], { repeat: '+', sep: TokenType.COMMA }),
    '}': TokenType.RBRACE
};

@nonTerminal({ implements: ExportDeclaration })
export class NamedExportDeclaration extends ExportDeclaration {
    @parser('export') setExportToken() {}

    @parser([Declaration, NamedExports], { definite: true })
    setValue(value: Declaration | ParseResult) {
        if (value instanceof Declaration) {
            super.addExport(value.name, value.locations.name, value.name, value.locations.name, value);
        } else {
            for (const e of value.exports as (ParseResult | Token)[]) {
                if (e instanceof Token) {
                    super.addExport(e.image, e.getLocation(), e.image, e.getLocation());
                } else {
                    const alias = e.alias as Token, name = e.name as Token;
                    super.addExport(alias.image, alias.getLocation(), name.image, name.getLocation());
                }
            }
        }
    }
}
