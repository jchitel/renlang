import { expect, assert } from 'chai';
import { resolve, dirname } from 'path';
import { readFileSync as readFile } from 'fs';

import Translator from '../../src/translator/Translator';
import { FunctionFunc } from '../../src/translator/Func';
import { ParamRef, AddToScope, SetIntegerRef, BinaryOperatorRef, Return, ConstBranch, ConstSet, ConstRef } from '../../src/runtime/instructions';
import { TFunction, TArray, TChar, TInteger, TTuple } from '../../src/typecheck/types';
import parse from '../../src/parser';
import typecheck from '../../src/typecheck';
import { reduceFunctionDeclaration } from '~/syntax/declarations/reduce';
import { STFunctionDeclaration } from '~/syntax/cst';
import { BinaryOperator } from '~/runtime/operators';


describe('Translator', () => {
    it('should verify the correct signature of a main function', () => {
        expect(new Translator().isMainSignature(new TFunction([new TArray(new TArray(new TChar()))], new TInteger(32, true)))).to.eql(true);
        expect(new Translator().isMainSignature(new TFunction([new TArray(new TArray(new TChar()))], new TTuple([])))).to.eql(true);
        expect(new Translator().isMainSignature(new TFunction([new TArray(new TArray(new TChar()))], new TArray(new TChar())))).to.eql(false);
        expect(new Translator().isMainSignature(new TFunction([new TArray(new TArray(new TInteger()))], new TTuple([])))).to.eql(false);
    });

    it('should create unique reference ids', () => {
        const tr = new Translator();
        expect(tr.newReference()).to.eql(0);
        expect(tr.newReference()).to.eql(1);
        expect(tr.newReference()).to.eql(2);
    });

    it('should create unique constant reference ids', () => {
        const tr = new Translator();
        expect(tr.newConstantRef()).to.eql(0);
        expect(tr.newConstantRef()).to.eql(1);
        expect(tr.newConstantRef()).to.eql(2);
    });

    it('should translate a function', () => {
        const src = 'func int add(int a, int b) => a + b';
        const ast = reduceFunctionDeclaration(parse(src).declarations[0].choice.choice as STFunctionDeclaration);
        const func = new FunctionFunc(0, { ast }, 0);
        const tr = new Translator();
        func.translate(tr);
        expect(func.instructions.slice(0, 4)).to.eql([
            new ParamRef(0, 0),
            new AddToScope('a', 0),
            new ParamRef(1, 1),
            new AddToScope('b', 1),
        ]);
    });

    it('should translate a module with a lambda function', () => {
        const src = 'func int doCallback(((int) => int) cb, int value) => cb(value)\n'
                  + 'func int main(string[] args) => doCallback(a => a + 1, -1)';
        const mods = typecheck(parse(src), '/index.ren');
        const funcs = new Translator().translate(mods);
        expect(funcs.length).to.eql(3);
        assert.containSubset(funcs[2].instructions, [
            new ParamRef(0, 6),                  // copy param 0 to ref 6
            new AddToScope('a', 6),              // set scope variable 'a' to point to ref 6
            new SetIntegerRef(7, 1),             // copy the integer 1 to ref 7
            new BinaryOperatorRef(8, 6, {} as BinaryOperator, 7), // copy add refs 6 and 7 and store the result in ref 8
            new Return(8),                       // return ref 8
        ]);
    });

    it('should translate a module with a constant', () => {
        const src = 'func int main(string[] args) => myConst + 1\n'
                  + 'export myConst = -1';
        const mods = typecheck(parse(src), '/index.ren');
        const funcs = new Translator().translate(mods);
        expect(funcs.length).to.eql(2);
        expect(funcs[1].instructions).to.eql([
            new ConstBranch({ constRef: 0, target: 3 }),    // if const 0 is set, jump to ic 3
            new SetIntegerRef(2, -1), // store the integer -1 into ref 2
            new ConstSet(0, 2),       // set const 0 to the value in ref 2
            new ConstRef(3, 0),       // ic 3: set ref 3 to const 0
            new Return(3),            // return ref 3
        ]);
    });

    it('should translate a reference to an imported function', () => {
        const path = resolve(dirname(__filename), '../../../testfiles/test.ren');
        const mods = typecheck(parse(readFile(path).toString()), path);
        const funcs = new Translator().translate(mods);
        expect(funcs.length).to.eql(5);
        expect(funcs[2].instructions).to.eql([
            new ParamRef(0, 3),     // copy param 0 into ref 3
            new AddToScope('p', 3), // set scope variable 'p' to point to ref 3
            new Return(3),          // return ref 3
        ]);
        expect(funcs[4].instructions).to.eql([
            new ConstBranch({ constRef: 0, target: 3 }),    // if const 0 is set, jump to ic 3
            new SetIntegerRef(6, 1), // store the integer -1 into ref 2
            new ConstSet(0, 6),       // set const 0 to the value in ref 2
            new ConstRef(7, 0),       // ic 3: set ref 3 to const 0
            new Return(7),            // return ref 3
        ]);
    });
});
