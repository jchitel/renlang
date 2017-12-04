import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { Block } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('Block', () => {
    const parse = createParser(Block);

    describe('visit()', generateVisitorTest(Block, 'visitBlock'));

    it('should parse a block', () => {
        assert.containSubset(parse('{}'), { statements: { length: 0 } });
        assert.containSubset(parse('{return;return}'), { statements: { length: 2 } });
    });
});
