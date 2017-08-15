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
});
