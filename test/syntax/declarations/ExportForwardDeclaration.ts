import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ExportForwardDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


const parse = createParser(ExportForwardDeclaration);

describe('ExportForwardDeclaration', () => {
    describe('visit()', generateVisitorTest(ExportForwardDeclaration, 'visitExportForwardDeclaration'));

    it('should parse a default forward export declaration', () => {
        assert.containSubset(parse('export default from "module"'), {
            moduleName: 'module',
            forwards: {
                length: 1,
                0: { importName: 'default', exportName: 'default' },
            },
        });
        assert.containSubset(parse('export default from "module": *'), {
            moduleName: 'module',
            forwards: {
                length: 1,
                0: { importName: '*', exportName: 'default' },
            },
        });
        assert.containSubset(parse('export default from "module": { Default }'), {
            moduleName: 'module',
            forwards: {
                length: 1,
                0: { importName: 'Default', exportName: 'default' },
            },
        });
    });

    it('should parse a named forward export declaration', () => {
        assert.containSubset(parse('export from "module": *'), {
            moduleName: 'module',
            forwards: {
                length: 1,
                0: { importName: '*', exportName: '*' },
            },
        });
        assert.containSubset(parse('export from "module": D, { A, B as C, * as W }'), {
            moduleName: 'module',
            forwards: {
                length: 4,
                0: { importName: 'default', exportName: 'D' },
                1: { importName: 'A', exportName: 'A' },
                2: { importName: 'B', exportName: 'C' },
                3: { importName: '*', exportName: 'W' },
            },
        });
        assert.containSubset(parse('export from "module": A, * as W'), {
            moduleName: 'module',
            forwards: {
                length: 2,
                0: { importName: 'default', exportName: 'A' },
                1: { importName: '*', exportName: 'W' },
            },
        });
    });
});
