import { NodeBase, SyntaxType, Declaration } from '~/syntax/environment';
import { ParseFunc, seq, tok, select, repeat } from '~/parser/parser';
import { Token, TokenType } from '~/parser/lexer';


/**
 * Cases:
 * - Default export of a name (export name = default, value name = value name, NO value)
 * - Named export of a name (export name AND value name = value name, NO value)
 * - Named export with an alias (export name = alias, value name = value name, NO value)
 * - Default export of a named value (export name = default, value name = name from value, value = value)
 * - Default export of an anonymous value (export name = default, NO value name, value = value)
 * - Named export of a named value (export name AND value name = name from value, value = value)
 */
interface Export {
    // export name is always present but may not be set TODO: this should ALWAYS be present, we should split out anonymous declarations
    readonly exportName: Optional<Token>;
    // value name is present for all but anonymous default exports
    readonly valueName: Optional<Token>;
    // value is not present for exports of existing names
    readonly value?: Declaration;
}

export interface ExportDeclaration extends NodeBase<SyntaxType.ExportDeclaration> {
    readonly exports: ReadonlyArray<Export>;
}

export function register(Declaration: ParseFunc<Declaration>) {
    const DefaultExportDeclaration: ParseFunc<ExportDeclaration> = seq(
        tok('export'),
        tok('default'),
        select<Declaration | Token>(
            Declaration,
            tok(TokenType.IDENT)
        ),
        ([_, def, value], location) => ({
            location,
            syntaxType: SyntaxType.ExportDeclaration as SyntaxType.ExportDeclaration,
            exports: value instanceof Token
                ? [{ exportName: def, valueName: value }]
                : [{ exportName: def, valueName: value.name, value }]
        })
    );

    /**
     * NamedExports ::= '{' (IDENT | (IDENT 'as' IDENT))(+ sep ',') '}'
     */
    const NamedExports: ParseFunc<Export[]> = seq(
        tok('{'),
        repeat(select<Export>(
            seq(
                tok(TokenType.IDENT),
                tok('as'),
                tok(TokenType.IDENT),
                ([name, _, alias]) => ({ exportName: alias, valueName: name })
            ),
            seq(tok(TokenType.IDENT), name => ({ exportName: name, valueName: name }))
        ), '+', tok(',')),
        tok('}'),
        ([_1, names, _2]) => names
    );

    const NamedExportDeclaration: ParseFunc<ExportDeclaration> = seq(
        tok('export'),
        select<Declaration | Export[]>(
            Declaration,
            NamedExports
        ),
        ([_, value], location) => ({
            location,
            syntaxType: SyntaxType.ExportDeclaration as SyntaxType.ExportDeclaration,
            exports: Array.isArray(value) ? value : [{ exportName: value.name, valueName: value.name, value }]
        })
    );

    /**
     * ExportDeclaration ::= DefaultExportDeclaration | NamedExportDeclaration
     */
    const ExportDeclaration: ParseFunc<ExportDeclaration> = select(
        DefaultExportDeclaration,
        NamedExportDeclaration
    );

    return { ExportDeclaration };
}
