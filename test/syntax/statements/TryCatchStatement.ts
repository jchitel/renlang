import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { TryCatchStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('TryCatchStatement', () => {
    const parse = createParser(TryCatchStatement);

    describe('visit()', generateVisitorTest(TryCatchStatement, 'visitTryCatchStatement'));

    it('should parse a simple try-catch statement', () => {
        assert.containSubset(parse('try {} catch (int err) {}'), {
            try: {},
            catches: {
                length: 1,
                0: { param: {}, body: {} },
            },
            finally: undefined,
        });
        assert.containSubset(parse('try {} catch (int err) {} catch (int err) {}'), {
            try: {},
            catches: {
                length: 2,
                0: { param: {}, body: {} },
                1: { param: {}, body: {} },
            },
            finally: undefined,
        });
        assert.containSubset(parse('try {} catch (int err) {} finally {}'), {
            try: {},
            catches: {
                length: 1,
                0: { param: {}, body: {} },
            },
            finally: {},
        });
    });
});
