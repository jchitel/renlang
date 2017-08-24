import { expect } from 'chai';

import Func from '../../src/translator/Func';
import Translator from '../../src/translator/Translator';
import { Expression } from '../../src/ast/expressions';
import { Return } from '../../src/runtime/instructions';


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
});
