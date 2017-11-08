import { assert } from 'chai';
import { resolve } from 'path';

import Module from '../../src/runtime/Module';
import { Program } from '../../src/syntax/ast';


function testfilePath(path: string) {
    return resolve(__dirname, '../../../testfiles/' + path);
}

describe('Module', () => {
    it('should construct Module instance', () => {
        const mod = new Module(0, '/index.ren', {} as Program);
        assert.strictEqual(mod.id, 0);
        assert.strictEqual(mod.path, '/index.ren');
        assert.deepEqual(mod.ast, {});
        assert.deepEqual(mod.imports, {});
        assert.deepEqual(mod.exports, {});
        assert.deepEqual(mod.types, {});
        assert.deepEqual(mod.functions, {});
        assert.deepEqual(mod.constants, {});
    });

    it('should parse an unparsed module', () => {
        const path = testfilePath('import.ren');
        const mod = new Module(0, path);
        assert.strictEqual(mod.id, 0);
        assert.strictEqual(mod.path, path);
        assert.instanceOf(mod.ast, Program);
    });

    it('should resolve an import of a relative directory', () => {
        const currentPath = testfilePath('import.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.strictEqual(mod.resolvePath('.'), testfilePath('index.ren'));
    });

    it('should resolve an import of a relative file', () => {
        const currentPath = testfilePath('import.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.strictEqual(mod.resolvePath('./nested/nestedModule.ren'), testfilePath('nested/nestedModule.ren'));
    });

    it('should resolve an import of a relative module name', () => {
        const currentPath = testfilePath('import.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.strictEqual(mod.resolvePath('./nested/nestedModule'), testfilePath('nested/nestedModule.ren'));
    });

    it('should return null for a non-existent relative path', () => {
        const currentPath = testfilePath('import.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.isNull(mod.resolvePath('./impossiblepath'));
    });

    it('should return null for path to a non-importable directory', () => {
        const currentPath = testfilePath('import.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.isNull(mod.resolvePath('./packages'));
    });

    it('should resolve a package import', () => {
        const currentPath = testfilePath('nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.strictEqual(mod.resolvePath('packageModule'), testfilePath('nested/packages/packageModule.ren'));
    });

    it('should resolve a parent package import', () => {
        const currentPath = testfilePath('nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.strictEqual(mod.resolvePath('parentPackageModule'), testfilePath('packages/parentPackageModule.ren'));
    });

    it('should return null if a package is not resolved all the way to root', () => {
        const currentPath = testfilePath('nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {} as Program);
        assert.isNull(mod.resolvePath('impossiblePackagePath'));
    });
});
