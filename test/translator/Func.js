import { expect } from 'chai';

import Func from '../../src/translator/Func';
import Translator from '../../src/translator/Translator';
import { Expression } from '../../src/ast/expressions';
import { Return, AddToScope, PushScopeFrame, PopFrame } from '../../src/runtime/instructions';


describe('Func', () => {
    it('should construct Func object', () => {
        const func = new Func(0, { ast: {} }, 0);
        expect(func.id).to.eql(0);
        expect(func.ast).to.eql({});
        expect(func.moduleId).to.eql(0);
        expect(func.instructions).to.eql([]);
        expect(func.scope).to.eql([{}]);
    });

    it('should translate expression body', () => {
        const func = new Func(0, {
            ast: {
                body: Object.assign(new Expression({}), { translate: () => 1 }),
            },
        }, 0);
        func.translateBody({});
        expect(func.instructions).to.eql([new Return(1)]);
    });

    it('should translate statement body', () => {
        const func = new Func(0, {
            ast: {
                body: { translate: (t, f) => f.addInstruction(new Return(1)) },
            },
        }, 0);
        func.translateBody({});
        expect(func.instructions).to.eql([new Return(1)]);
    });

    it('should add instruction', () => {
        const func = new Func(0, { ast: {} }, 0);
        expect(func.addInstruction(new Return(1))).to.eql(new Return(1));
        expect(func.instructions).to.eql([new Return(1)]);
    });

    it('should add ref instruction', () => {
        const func = new Func(0, { ast: {} }, 0);
        const translator = new Translator();
        expect(func.addRefInstruction(translator, r => new Return(1))).to.eql(0);
        expect(func.addRefInstruction(translator, r => new Return(1))).to.eql(1);
        expect(func.addRefInstruction(translator, r => new Return(1))).to.eql(2);
        expect(func.instructions).to.eql([new Return(1), new Return(1), new Return(1)]);
    });

    it('should get the next instruction number', () => {
        const func = new Func(0, { ast: {} }, 0);
        expect(func.nextInstrNum()).to.eql(0);
        func.addInstruction(new Return(1));
        expect(func.nextInstrNum()).to.eql(1);
    });

    it('should get from deep scope', () => {
        const func = new Func(0, { ast: {} }, 0);
        func.scope = [{}, { myVar: 2 }, {}, { myVar: 3 }, {}, {}];
        expect(func.getFromScope('myVar')).to.eql(3);
    });

    it('should get from scope without variable', () => {
        const func = new Func(0, { ast: {} }, 0);
        func.scope = [{}, {}, {}, {}, {}, { someVar: 4 }];
        expect(func.getFromScope('myVar')).to.eql(undefined);
    });

    it('should set in deep scope', () => {
        const func = new Func(0, { ast: {} }, 0);
        func.scope = [{}, { myVar: 2 }, {}, { myVar: 3 }, {}, {}];
        const inst = new AddToScope('myVar', 5);
        expect(func.addToScope('myVar', 5, inst)).to.eql(inst);
        expect(func.instructions).to.eql([inst]);
        expect(func.scope).to.eql([{}, { myVar: 2 }, {}, { myVar: 5 }, {}, {}]);
    });

    it('should set in scope without variable', () => {
        const func = new Func(0, { ast: {} }, 0);
        func.scope = [{}, {}, {}, {}, {}, { someVar: 4 }];
        const inst = new AddToScope('myVar', 5);
        expect(func.addToScope('myVar', 5, inst)).to.eql(inst);
        expect(func.instructions).to.eql([inst]);
        expect(func.scope).to.eql([{}, {}, {}, {}, {}, { someVar: 4, myVar: 5 }]);
    });

    it('should push a frame', () => {
        const func = new Func(0, { ast: {} }, 0);
        const inst = new PushScopeFrame();
        expect(func.pushScope(inst)).to.eql(inst);
        expect(func.instructions).to.eql([inst]);
        expect(func.scope).to.eql([{}, {}]);
    });

    it('should pop a frame', () => {
        const func = new Func(0, { ast: {} }, 0);
        func.scope = [{}, {}];
        const inst = new PopFrame();
        expect(func.popScope(inst)).to.eql(inst);
        expect(func.instructions).to.eql([inst]);
        expect(func.scope).to.eql([{}]);
    });
});
