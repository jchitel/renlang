import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ExportDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


const parse = createParser(ExportDeclaration);

describe('ExportDeclaration', () => {
    describe('visit()', generateVisitorTest(ExportDeclaration, 'visitExportDeclaration'));

    it('should parse a default export declaration', () => {
        assert.containSubset(parse('export default value'), {
            exports: {
                length: 1,
                0: { exportName: 'default', valueName: 'value', value: undefined },
            },
        });
        assert.containSubset(parse('export default const value = 1'), {
            exports: {
                length: 1,
                0: { exportName: 'default', valueName: 'value', value: {} },
            },
        });
    });

    it('should parse a named export declaration', () => {
        assert.containSubset(parse('export const value = 1'), {
            exports: {
                length: 1,
                0: { exportName: 'value', valueName: 'value', value: {} },
            },
        });
        assert.containSubset(parse('export { value as value1, value2 }'), {
            exports: {
                length: 2,
                0: { exportName: 'value1', valueName: 'value', value: undefined },
                1: { exportName: 'value2', valueName: 'value2', value: undefined },
            },
        });
    });
});
