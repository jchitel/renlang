import { Location, Token, TokenType } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal, exp, ParseResult } from '~/parser/Parser';
import { NonImportDeclaration } from './Program';
import { ImportList } from './ImportDeclaration';


/**
 * ExportForwardDeclaration ::= DefaultExportForwardDeclaration | NamedExportForwardDeclaration
 * 
 * We implemented this using the inheritance model because it ended up being simpler that way.
 */
@nonTerminal({ abstract: true, implements: NonImportDeclaration })
export abstract class ExportForwardDeclaration extends NonImportDeclaration {
    moduleName: string;
    forwards: {
        importName: string,
        importLocation: Location,
        exportName: string,
        exportLocation: Location,
    }[] = [];

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitExportForwardDeclaration(this);
    }

    protected addForward(importName: string, importLocation: Location, exportName: string, exportLocation: Location) {
        this.forwards.push({ importName, importLocation, exportName, exportLocation });
    }
}

/**
 * DefaultExportForwards ::= COLON (LBRACE IDENT RBRACE | '*')
 */
const DefaultExportForwards = {
    ':': exp(TokenType.COLON, { definite: true }),
    value: [{
        '{': exp(TokenType.LBRACE, { definite: true }),
        name: TokenType.IDENT,
        '}': TokenType.RBRACE,
    }, '*']
};

/**
 * DefaultExportForwardDeclaration ::= EXPORT DEFAULT FROM STRING_LITERAL DefaultExportForwards?
 */
@nonTerminal({ implements: ExportForwardDeclaration })
// @ts-ignore: Decorator registers this class, so it is used
class DefaultExportForwardDeclaration extends ExportForwardDeclaration {
    @parser('export') setExportToken() {}

    @parser('default')
    setDefaultToken(token: Token) {
        this.registerLocation('default', token.getLocation());
    }

    @parser('from', { definite: true }) setFromToken() {}

    @parser(TokenType.STRING_LITERAL, { err: 'INVALID_IMPORT_MODULE' })
    setModuleName(token: Token) {
        this.moduleName = token.value;
        this.registerLocation('moduleName', token.getLocation());
        super.addForward('default', this.locations.default, 'default', this.locations.default);
    }

    @parser(DefaultExportForwards, { optional: true })
    setForwards(result: ParseResult) {
        this.forwards = [];
        const value = result.value as (ParseResult | Token);
        if (value instanceof Token) super.addForward('*', value.getLocation(), 'default', this.locations.default);
        else {
            const name = value.name as Token;
            super.addForward(name.image, name.getLocation(), 'default', this.locations.default);
        }
    }
}

/**
 * DefaultExportForwardDeclaration ::= EXPORT DEFAULT FROM STRING_LITERAL DefaultExportForwards?
 */
@nonTerminal({ implements: ExportForwardDeclaration })
// @ts-ignore: Decorator registers this class, so it is used
class NamedExportForwardDeclaration extends ExportForwardDeclaration {
    @parser('export') setExportToken() {}
    
    @parser('from', { definite: true }) setFromToken() {}

    @parser(TokenType.STRING_LITERAL, { err: 'INVALID_IMPORT_MODULE' })
    setModuleName(token: Token) {
        this.moduleName = token.value;
        this.registerLocation('moduleName', token.getLocation());
    }

    @parser(TokenType.COLON, { err: 'INVALID_IMPORT' }) setColon() {}

    @parser([...ImportList, '*'])
    setValue(result: ParseResult | Token) {
        if (result instanceof Token) {
            // wildcard to wildcard
            super.addForward('*', result.getLocation(), '*', result.getLocation());
        } else {
            if (result.defaultImport instanceof Token) {
                const defaultImport = result.defaultImport as Token;
                this.addForward('default', defaultImport.getLocation(), defaultImport.image, defaultImport.getLocation());
            }
            if (result['*'] instanceof Token) {
                const w = result['*'] as Token, a = result.alias as Token;
                this.addForward('*', w.getLocation(), a.image, a.getLocation());
            }
            if (Array.isArray(result.names)) {
                for (const i of result.names as (ParseResult | Token)[]) {
                    const [importName, exportName] = (i instanceof Token) ? [i, i]
                        : (i.name) ? [i.name as Token, i.alias as Token]
                        : [i['*'] as Token, i.alias as Token];
                    this.addForward(importName.image, importName.getLocation(), exportName.image, exportName.getLocation());
                }
            }
        }
    }
}
