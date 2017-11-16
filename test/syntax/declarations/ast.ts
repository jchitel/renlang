import { assert } from 'chai';
import * as sinon from 'sinon';

import { TestVisitor } from '~test/test-utils';
import ASTNode from '~/syntax/ASTNode';
import * as ast from '~/syntax/declarations/ast';
import { TBool, TChar } from '~/typecheck/types';


describe('Declaration AST nodes', () => {
    describe('visit() methods', () => {
        let sandbox: sinon.SinonSandbox;

        beforeEach(() => sandbox = sinon.sandbox.create());
        afterEach(() => sandbox.restore());

        function testVisitor(node: ASTNode, method: keyof TestVisitor) {
            const visitor = new TestVisitor();
            const spy = sandbox.spy(visitor, method);
            node.visit(visitor);
            sinon.assert.calledOnce(spy);
        }

        it('should call visitProgram()', () => testVisitor(new ast.Program(), 'visitProgram'));
        it('should call visitImportDeclaration()', () => testVisitor(new ast.ImportDeclaration(), 'visitImportDeclaration'));
        it('should call visitTypeDeclaration()', () => testVisitor(new ast.TypeDeclaration(), 'visitTypeDeclaration'));
        it('should call visitTypeParam()', () => testVisitor(new ast.TypeParam(), 'visitTypeParam'));
        it('should call visitFunctionDeclaration()', () => testVisitor(new ast.FunctionDeclaration(), 'visitFunctionDeclaration'));
        it('should call visitParam()', () => testVisitor(new ast.Param(), 'visitParam'));
        it('should call visitExportDeclaration()', () => testVisitor(new ast.ExportDeclaration(), 'visitExportDeclaration'));
    });

    it('should get pretty function name', () => {
        const func = new ast.FunctionDeclaration();
        func.name = 'myFunc';
        func.params = [
            Object.assign(new ast.Param(), { name: 'p1', type: new TBool() }),
            Object.assign(new ast.Param(), { name: 'p2', type: new TChar() }),
        ];
        assert.strictEqual(func.prettyName(), 'myFunc(bool p1, char p2)');
    });

    it('should get pretty constant name', () => {
        const con = new ast.ConstantDeclaration();
        con.name = 'myConst';
        assert.strictEqual(con.prettyName(), 'const myExport');
    });
});
