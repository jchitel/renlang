import { NodeBase, SyntaxType, Declaration, AnonymousDeclaration, isDeclaration } from '~/syntax/environment';
import { ParseFunc, seq, tok, select, repeat } from '~/parser/parser';
import { Token, TokenType } from '~/parser/lexer';
import { FileRange } from '~/core';


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
    // export name is always present
    readonly exportName: Token;
    // value name is present for all but anonymous default exports
    readonly valueName: Optional<Token>;
    // value is not present for exports of existing names
    readonly value?: Declaration | AnonymousDeclaration;
}

export class ExportDeclaration extends NodeBase<SyntaxType.ExportDeclaration> {
    constructor(
        location: FileRange,
        readonly exports: ReadonlyArray<Export>
    ) { super(location, SyntaxType.ExportDeclaration) }

    accept<T, R = T>(visitor: ExportDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitExportDeclaration(this, param);
    }
}

export interface ExportDeclarationVisitor<T, R = T> {
    visitExportDeclaration(node: ExportDeclaration, param: T): R;
}

export function register(parseDeclaration: ParseFunc<Declaration>, parseAnonymousDeclaration: ParseFunc<AnonymousDeclaration>) {
    const parseDefaultExportDeclaration: ParseFunc<ExportDeclaration> = seq(
        tok('export'),
        tok('default'),
        select<Declaration | AnonymousDeclaration | Token>(
            parseDeclaration,
            parseAnonymousDeclaration,
            tok(TokenType.IDENT)
        ),
        ([_, def, value], location) => new ExportDeclaration(location,
            value instanceof Token ? [{ exportName: def, valueName: value }]
                : isDeclaration(value) ? [{ exportName: def, valueName: value.name, value }]
                : [{ exportName: def, valueName: null, value }])
    );

    /**
     * NamedExports ::= '{' (IDENT | (IDENT 'as' IDENT))(+ sep ',') '}'
     */
    const parseNamedExports: ParseFunc<Export[]> = seq(
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

    const parseNamedExportDeclaration: ParseFunc<ExportDeclaration> = seq(
        tok('export'),
        select<Declaration | Export[]>(
            parseDeclaration,
            parseNamedExports
        ),
        ([_, value], location) => new ExportDeclaration(location,
            Array.isArray(value) ? value : [{ exportName: value.name, valueName: value.name, value }])
    );

    /**
     * ExportDeclaration ::= DefaultExportDeclaration | NamedExportDeclaration
     */
    const parseExportDeclaration: ParseFunc<ExportDeclaration> = select(
        parseDefaultExportDeclaration,
        parseNamedExportDeclaration
    );

    return { parseExportDeclaration };
}
