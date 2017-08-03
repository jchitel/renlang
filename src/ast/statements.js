import ASTNode from './ASTNode';


export class Statement extends ASTNode {
    reduce() {
        if (this.block) {
            return this.block.reduce();
        } else if (this.exp) {
            return this.exp.reduce();
        } else if (this.for) {
            return this.for.reduce();
        } else if (this.while) {
            return this.while.reduce();
        } else if (this.doWhile) {
            return this.doWhile.reduce();
        } else if (this.tryCatch) {
            return this.tryCatch.reduce();
        } else if (this.throw) {
            return this.throw.reduce();
        } else if (this.return) {
            return this.return.reduce();
        } else if (this.break) {
            return this.break.reduce();
        } else if (this.continue) {
            return this.continue.reduce();
        } else {
            throw new Error('Invalid Statement node');
        }
    }
}

export class Block extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        // filter out noops, because noops inside blocks mean nothing
        node.statements = this.statements.map(s => s.reduce()).filter(s => !(s instanceof Noop));
        // once all noops have been removed, if this is now empty, return a noop
        if (!node.statements.length) return new Noop(this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends ASTNode {
    constructor(startLoc, endLoc) {
        super({});
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }
}

export class ForStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.iterVar = this.iterVar.image;
        node.registerlocation('iterVar', this.iterVar.getLocation());
        node.iterableExp = this.iterableExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.forToken.getLocation(), node.body.locations.self);
        return node;
    }
}

export class WhileStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.conditionExp = this.conditionExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.whileToken.getLocation(), node.body.locations.self);
        return node;
    }
}

export class DoWhileStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.body = this.body.reduce();
        node.conditionExp = this.conditionExp.reduce();
        node.createAndRegisterLocation('self', this.doToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class TryCatchStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.try = this.tryBody.reduce();
        node.catches = [];
        for (let i = 0; i < this.catchParams.length; ++i) {
            node.catches.push({ param: this.catchParams[i].reduce(), body: this.catchBlocks[i].reduce() });
        }
        if (this.finallyBlock) node.finally = this.finallyBlock.reduce();
        node.createAndRegisterLocation('self', this.tryToken.getLocation(), node.finally ? node.finally.locations.self : node.catches[node.catches.length - 1].locations.self);
        return node;
    }
}

export class ThrowStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.exp = this.exp.reduce();
        node.createAndRegisterLocation('self', this.throwToken.getLocation(), node.exp.locations.self);
        return node;
    }
}

export class ReturnStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.exp) {
            node.exp = this.exp.reduce();
            node.createAndRegisterLocation('self', this.returnToken.getLocation(), node.exp.locations.self);
        } else {
            node.registerlocation('self', this.returnToken.getLocation());
        }
        return node;
    }
}

export class BreakStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.breakToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.registerlocation('self', this.breakToken.getLocation());
        }
        return node;
    }
}

export class ContinueStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.continueToken.getLocation(), this.continueToken.getLocation());
        } else {
            node.registerlocation('self', this.continueToken.getLocation());
        }
        return node;
    }
}
