import { expect } from 'chai';
import { resolve } from 'path';

import Module from '../../src/runtime/Module';
import { Program } from '../../src/ast/declarations';


describe('Module', () => {
    it('should construct Module instance', () => {
        const mod = new Module(0, '/index.ren', {});
        expect(mod.id).to.eql(0);
        expect(mod.path).to.eql('/index.ren');
        expect(mod.ast).to.eql({});
        expect(mod.imports).to.eql({});
        expect(mod.exports).to.eql({});
        expect(mod.types).to.eql({});
        expect(mod.functions).to.eql({});
        expect(mod.constants).to.eql({});
    });

    it('should parse an unparsed module', () => {
        const path = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, path);
        expect(mod.id).to.eql(0);
        expect(mod.path).to.eql(path);
        expect(mod.ast instanceof Program).to.eql(true);
    });

    it('should resolve an import of a relative directory', () => {
        const currentPath = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('.')).to.eql(resolve(__filename, '../../testfiles/index.ren'));
    });

    it('should resolve an import of a relative file', () => {
        const currentPath = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('./nested/nestedModule.ren')).to.eql(resolve(__filename, '../../testfiles/nested/nestedModule.ren'));
    });

    it('should resolve an import of a relative module name', () => {
        const currentPath = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('./nested/nestedModule')).to.eql(resolve(__filename, '../../testfiles/nested/nestedModule.ren'));
    });

    it('should return null for a non-existent relative path', () => {
        const currentPath = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('./impossiblepath')).to.eql(null);
    });

    it('should return null for path to a non-importable directory', () => {
        const currentPath = resolve(__filename, '../../testfiles/import.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('./packages')).to.eql(null);
    });

    it('should resolve a package import', () => {
        const currentPath = resolve(__filename, '../../testfiles/nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('packageModule')).to.eql(resolve(__filename, '../../testfiles/nested/packages/packageModule.ren'));
    });

    it('should resolve a parent package import', () => {
        const currentPath = resolve(__filename, '../../testfiles/nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('parentPackageModule')).to.eql(resolve(__filename, '../../testfiles/packages/parentPackageModule.ren'));
    });

    it('should return null if a package is not resolved all the way to root', () => {
        const currentPath = resolve(__filename, '../../testfiles/nested/nestedModule.ren');
        const mod = new Module(0, currentPath, {});
        expect(mod.resolvePath('impossiblePackagePath')).to.eql(null);
    });
});
