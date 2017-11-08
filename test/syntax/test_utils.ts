import CSTNode from '../../src/syntax/CSTNode';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { TType, TInteger } from '../../src/typecheck/types';
import { Location } from '../../src/parser/Tokenizer';
import TypeChecker from '../../src/typecheck/TypeChecker';
import TypeCheckContext from '../../src/typecheck/TypeCheckContext';
import Module from '../../src/runtime/Module';
import { FunctionFunc } from '../../src/translator/Func';


/**
 * This is a dummy CST node class that simply returns
 * the provided value when you call reduce().
 */
export class STDummyNode extends CSTNode {
    value: any;

    constructor(value: any = {}) {
        super({});
        this.value = value;
    }
}

/**
 * This is a dummy AST node class that simply returns
 * the provided type when you call getType() or resolveType().
 */
export class DummyNode extends ASTNode {
    _context?: TypeCheckContext;

    constructor(type: TType, locations: { [key: string]: Location } = {}, context?: TypeCheckContext) {
        super();
        this.type = type;
        this.locations = locations;
        this._context = context;
    }

    visit<T>(_visitor: INodeVisitor<T>) { return {} as T; }

    getType() {
        return this.type;
    }

    resolveType(_1: any, _2: any, context: TypeCheckContext) {
        if (this._context) Object.assign(this._context, context);
        return this.type;
    }
}

/**
 * Dummy type checker that just returns the provided type
 * from getType().
 */
export class DummyTC extends TypeChecker {
    _type: TType;

    constructor(type: TType) {
        super();
        this._type = type;
    }

    getType() {
        return this._type;
    }
}

export class DummyModule extends Module {
    constructor(props: Partial<Module> = {}) {
        super(props.id || 0, props.path || '');
        Object.assign(this, props);
    }
}

/**
 * This will just return a dummy func with no AST
 */
export function getDummyFunc() {
    return new FunctionFunc(0, { ast: o() }, 0);
}

// dummy 32-bit signed integer type
export const int = new TInteger(32, true);
// dummy default location
export const loc = new Location(1, 1, 1, 1);

/**
 * This is a very useful function that creates an instance of a class
 * and applies the provided props.
 * NOTE: this is NOT type safe, as the props object can be any object.
 */
export function createInstance<T>(cls: Class<T>, props: {}): T {
    return Object.assign(Object.create(cls.prototype), props);
}

/**
 * This is a simple function that prevents you from having
 * to cast empty objects as a particular type.
 * Simply call o() and typescript will be ok with it.
 * NOTE: this is NOT type safe because it ignores non-optional properties.
 */
export function o<T extends {}>(obj: {} = {}): T {
    return obj as T;
}
