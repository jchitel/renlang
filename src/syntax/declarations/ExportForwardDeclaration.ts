import { parseImportList } from './ImportDeclaration';
import { ParseFunc, seq, select, tok, optional } from '~/parser/parser';
import { Token, TokenType } from '~/parser/lexer';
import { NodeBase, SyntaxType } from '~/syntax/environment';
import { FileRange } from '~/core';


export interface Forward {
    readonly importName: Token;
    readonly exportName: Token;
}

export class ExportForwardDeclaration extends NodeBase<SyntaxType.ExportForwardDeclaration> {
    constructor(
        location: FileRange,
        readonly moduleName: Token,
        readonly forwards: ReadonlyArray<Forward>
    ) { super(location, SyntaxType.ExportForwardDeclaration) }

    accept<T, R = T>(visitor: ExportForwardDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitExportForwardDeclaration(this, param);
    }
}

export interface ExportForwardDeclarationVisitor<T, R = T> {
    visitExportForwardDeclaration(node: ExportForwardDeclaration, param: T): R;
}

/**
 * DefaultExportForwards ::= COLON (LBRACE IDENT RBRACE | '*')
 */
const parseDefaultExportForwards: ParseFunc<Token> = seq(
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
const parseDefaultExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = seq(
    tok('export'),
    tok('default'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    optional(parseDefaultExportForwards),
    ([_1, def, _2, moduleName, fwd], location) => new ExportForwardDeclaration(
        location,
        moduleName,
        [{ importName: fwd || def, exportName: def }]
    )
);

/**
 * DefaultExportForwardDeclaration ::= EXPORT FROM STRING_LITERAL ':' (ImportList | '*')
 */
const parseNamedExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = seq(
    tok('export'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    tok(':'),
    select<Forward[]>(
        seq(parseImportList, imps => imps.map(({ importName, aliasName }) => ({ importName, exportName: aliasName }))),
        seq(tok('*'), _ => [{ importName: _, exportName: _ }])
    ),
    ([_1, _2, moduleName, _3, forwards], location) => new ExportForwardDeclaration(
        location, moduleName, forwards
    )
);

/**
 * ExportForwardDeclaration ::= DefaultExportForwardDeclaration | NamedExportForwardDeclaration
 */
export const parseExportForwardDeclaration: ParseFunc<ExportForwardDeclaration> = select(
    parseDefaultExportForwardDeclaration,
    parseNamedExportForwardDeclaration
);
