import { assert } from 'chai';

import ASTNode from '../../src/syntax/ASTNode';
import INodeVisitor from '../../src/syntax/INodeVisitor';
import { Location } from '~/parser/Tokenizer';


class TestNode extends ASTNode {
    visit<T>(_visitor: INodeVisitor<T>) {
        return {} as T;
    }
}

const loc = new Location(1, 1, 1, 1);
const endLoc = new Location(2, 2, 2, 2);

describe('AST Node', () => {
    it('should register location', () => {
        const node = new TestNode();
        assert.isUndefined(node.locations);
        node.registerLocation('self', loc);
        assert.deepEqual(node.locations, { self: loc });
    });

    it('should create and register location', () => {
        const node = new TestNode();
        node.createAndRegisterLocation('self', loc, endLoc);
        assert.deepEqual(node.locations, {
            self: new Location(1, 1, 2, 2),
        });
    })
});
