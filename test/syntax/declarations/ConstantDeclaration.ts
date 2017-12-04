import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ConstantDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


const parse = createParser(ConstantDeclaration);

describe('ConstantDeclaration', () => {
    describe('visit()', generateVisitorTest(ConstantDeclaration, 'visitConstantDeclaration'));

    it('should parse a constant declaration', () => {
        assert.containSubset(parse('const a = 1'), { name: 'a', value: {} });
    });

    it('should get pretty constant name', () => {
        const con = new ConstantDeclaration();
        con.name = 'myConst';
        assert.strictEqual(con.prettyName(), 'const myConst');
    });
});
