import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { Program, Declaration, NonImportDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('Declaration', () => {
    const parse = createParser(Declaration);

    it('should parse a function as a declaration', () => assert.isDefined(parse('func int a() => b')));
    it('should parse a type as a declaration', () => assert.isDefined(parse('type a = int')));
    it('should parse a constant as a declaration', () => assert.isDefined(parse('const a = 1')));
});

describe('NonImportDeclaration', () => {
    const parse = createParser(NonImportDeclaration);

    it('should parse a declaration as a non-import declaration', () => assert.isDefined(parse('const a = 1')));
    it('should parse an export as a non-import declaration', () => assert.isDefined(parse('export default const = 1')));
    it('should parse an export forward as a non-import declaration', () => assert.isDefined(parse('export default from "module"')));
});

describe('Program', () => {
    const parse = createParser(Program);

    describe('visit()', generateVisitorTest(Program, 'visitProgram'));

    it('should parse a program', () => {
        assert.containSubset(parse(''), { imports: [], declarations: [] });
        assert.containSubset(parse('import from "module": myDefault'), { imports: { length: 1 } });
        assert.containSubset(parse('func int a() => b'), { declarations: { length: 1 } });
        assert.containSubset(parse('import from "module": myDefault;func int a() => b'), {
            imports: { length: 1 },
            declarations: { length: 1 },
        });
    });
});
