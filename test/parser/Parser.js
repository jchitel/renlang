import { expect } from 'chai';

import Parser from '../../src/parser/Parser';
import { Program, ImportDeclaration, ImportComponent } from '../../src/ast';
import { Token } from '../../src/parser/Tokenizer';


const parser = new Parser();

describe('Parser', () => {
    it('should parse import declarations', () => {
        const sourceString =
`import from "myModule": MyDefaultImport
import from "otherModule" { name, name1 as oneName, myName }; import from "thirdModule": OtherDefault
`;
        const parsed = parser.parse(sourceString);
        expect(parsed).to.eql(new Program([
            new ImportDeclaration({
                importToken: new Token('IMPORT', 1, 1, 'import'),
                fromToken: new Token('FROM', 1, 8, 'from'),
                moduleNameToken: new Token('STRING_LITERAL', 1, 13, '"myModule"', 'myModule'),
                colonToken: new Token('COLON', 1, 23, ":"),
                defaultImportNameToken: new Token('IDENT', 1, 25, 'MyDefaultImport', null, true),
                defaultImport: true,
            }),
            new ImportDeclaration({
                importToken: new Token('IMPORT', 2, 1, 'import'),
                fromToken: new Token('FROM', 2, 8, 'from'),
                moduleNameToken: new Token('STRING_LITERAL', 2, 13, '"otherModule"', 'otherModule'),
                namedImportOpenBraceToken: new Token('LBRACE', 2, 27, "{"),
                importComponents: [
                    new ImportComponent({
                        importNameToken: new Token('IDENT', 2, 29, 'name'),
                        commaToken: undefined,
                    }),
                    new ImportComponent({
                        commaToken: new Token('COMMA', 2, 33, ','),
                        importNameToken: new Token('IDENT', 2, 35, 'name1'),
                        asToken: new Token('AS', 2, 41, 'as'),
                        importAliasToken: new Token('IDENT', 2, 44, 'oneName'),
                    }),
                    new ImportComponent({
                        commaToken: new Token('COMMA', 2, 51, ','),
                        importNameToken: new Token('IDENT', 2, 53, 'myName'),
                    }),
                ],
                namedImportCloseBraceToken: new Token('RBRACE', 2, 60, '}', null, true),
                defaultImport: false,
            }),
            new ImportDeclaration({
                importToken: new Token('IMPORT', 2, 63, 'import'),
                fromToken: new Token('FROM', 2, 70, 'from'),
                moduleNameToken: new Token('STRING_LITERAL', 2, 75, '"thirdModule"', 'thirdModule'),
                colonToken: new Token('COLON', 2, 88, ":"),
                defaultImportNameToken: new Token('IDENT', 2, 90, 'OtherDefault', null, true),
                defaultImport: true,
            }),
        ], []));
    });
});
