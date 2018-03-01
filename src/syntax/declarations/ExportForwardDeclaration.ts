import { ImportList } from './ImportDeclaration';
import { ParseFunc, seq, select, tok, optional } from '~/parser/parser';
import { Token, TokenType } from '~/parser/lexer';
import { NodeBase, SyntaxType } from '~/syntax/environment';


export interface Forward {
    readonly importName: Token;
    readonly exportName: Token;
}

export interface ExportForwardDeclaration extends NodeBase {
    readonly syntaxType: SyntaxType.ExportForwardDeclaration;
    readonly moduleName: Token;
    readonly forwards: ReadonlyArray<Forward>;
}

/**
 * DefaultExportForwards ::= COLON (LBRACE IDENT RBRACE | '*')
 */
const DefaultExportForwards: ParseFunc<Token> = seq(
    tok(':'),
    select<Token>(
        tok('*'),
        seq(
            tok('{'),
            tok(TokenType.IDENT),
            tok('}'),
            ([_1, name, _2]) => name
        )
    ),
    ([_, exp]) => exp
);

/**
 * DefaultExportForwardDeclaration ::= EXPORT DEFAULT FROM STRING_LITERAL DefaultExportForwards?
 */
const DefaultExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = seq(
    tok('export'),
    tok('default'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    optional(DefaultExportForwards),
    ([_1, def, _2, moduleName, fwd], location) => ({
        syntaxType: SyntaxType.ExportForwardDeclaration as SyntaxType.ExportForwardDeclaration,
        location,
        moduleName,
        forwards: [{ importName: fwd || def, exportName: def }]
    })
);

/**
 * DefaultExportForwardDeclaration ::= EXPORT FROM STRING_LITERAL ':' (ImportList | '*')
 */
const NamedExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = seq(
    tok('export'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    tok(':'),
    select<Forward[]>(
        seq(ImportList, imps => imps.map(({ importName, aliasName }) => ({ importName, exportName: aliasName }))),
        seq(tok('*'), _ => [{ importName: _, exportName: _ }])
    ),
    ([_1, _2, moduleName, _3, forwards], location) => ({
        syntaxType: SyntaxType.ExportForwardDeclaration as SyntaxType.ExportForwardDeclaration,
        location,
        moduleName,
        forwards
    })
);

/**
 * ExportForwardDeclaration ::= DefaultExportForwardDeclaration | NamedExportForwardDeclaration
 */
export const ExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = select(
    DefaultExportForwardDeclaration,
    NamedExportForwardDeclaration
);
