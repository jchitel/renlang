import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ImportDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


const parse = createParser(ImportDeclaration);

describe('ImportDeclaration', () => {
    describe('visit()', generateVisitorTest(ImportDeclaration, 'visitImportDeclaration'));

    it('should parse a default import declaration', () => {
        assert.containSubset(parse('import from "module": Default'), {
            moduleName: 'module',
            imports: {
                length: 1,
                0: { importName: 'default', aliasName: 'Default' },
            },
        });
    });

    it('should parse a wildcard import declaration', () => {
        assert.containSubset(parse('import from "module": * as Wildcard'), { 
            moduleName: 'module',
            imports: {
                length: 1,
                0: { importName: '*', aliasName: 'Wildcard' },
            },
        });
    });

    it('should parse import list', () => {
        assert.containSubset(parse('import from "module": { A, B as C, * as D }'), {
            moduleName: 'module',
            imports: {
                length: 3,
                0: { importName: 'A', aliasName: 'A' },
                1: { importName: 'B', aliasName: 'C' },
                2: { importName: '*', aliasName: 'D' },
            },
        });
    });

    it('should parse combined forms', () => {
        assert.containSubset(parse('import from "module": Default, { A }'), {
            moduleName: 'module',
            imports: {
                length: 2,
                0: { importName: 'default', aliasName: 'Default' },
                1: { importName: 'A', aliasName: 'A' },
            },
        });
        assert.containSubset(parse('import from "module": Default, * as W'), {
            moduleName: 'module',
            imports: {
                length: 2,
                0: { importName: 'default', aliasName: 'Default' },
                1: { importName: '*', aliasName: 'W' },
            },
        });
    });
});
