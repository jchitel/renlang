import * as sinon from 'sinon';

import { TestVisitor } from '~test/test-utils';
import ASTNode from '~/syntax/ASTNode';
import * as ast from '~/syntax/types/ast';
import { Location } from '~/parser/Tokenizer';


describe('Type AST nodes', () => {
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

        const loc = new Location(1, 1, 1, 1);

        it('should call visitPrimitiveType()', () => testVisitor(new ast.PrimitiveType('int', loc), 'visitPrimitiveType'));
        it('should call visitIdentifierType()', () => testVisitor(new ast.IdentifierType('a', loc), 'visitIdentifierType'));
        it('should call visitArrayType()', () => testVisitor(new ast.ArrayType(), 'visitArrayType'));
        it('should call visitFunctionType()', () => testVisitor(new ast.FunctionType(), 'visitFunctionType'));
        it('should call visitParenthesizedType()', () => testVisitor(new ast.ParenthesizedType(), 'visitParenthesizedType'));
        it('should call visitSpecificType()', () => testVisitor(new ast.SpecificType(), 'visitSpecificType'));
        it('should call visitStructType()', () => testVisitor(new ast.StructType(), 'visitStructType'));
        it('should call visitTupleType()', () => testVisitor(new ast.TupleType(), 'visitTupleType'));
        it('should call visitUnionType()', () => testVisitor(new ast.UnionType(), 'visitUnionType'));
    });
});
