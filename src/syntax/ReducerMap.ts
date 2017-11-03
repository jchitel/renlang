import CSTNode from './CSTNode';
import ASTNode from './ASTNode';


/**
 * A reducer is a function that converts a CST node to an equivalent AST node
 */
export type Reducer<From extends CSTNode, To extends ASTNode> = (from: From) => To;

/**
 * TODO: it would be interesting to have a function that has dynamic dispatch
 * built in, so you could specify multiple overloads
 * and instead of having to put a visit() method in each type,
 * that logic would be implicitly added in:
 * 
 * func reduceType(dynamic STArrayType type) => { ... }
 * func reduceType(dynamic STStructType type) => { ... }
 * ...
 * 
 * The `dynamic` keyword basically means "use the runtime type, not the
 * compile-time type".
 * 
 * This would allow us to implement the visitor pattern without the usual overhead.
 */

/**
 * This class is a simple Map extension that effectively gives us the visitor
 * pattern for reducers without having to implement it on each class.
 * Because we are implementing CST classes as purely key-value pairs for the tree,
 * we cannot add methods to them. This requires a separate structure to facilitate
 * dynamic dispatch, which is exactly what ReducerMap provides.
 * 
 * For each type of node (types, statements, expressions), you create a ReducerMap.
 * For example
 * 
 * const reducerMap = new ReducerMap<STType, Type>();
 * 
 * Then for each reducer that converts from an STType to a Type, you do the following:
 * 
 * export const reduceXType = reducerMap.add(STXType, (type) => { ... });
 * 
 * This will register that function as the reducer for that specific type, then
 * return it so that it can be easily exported from a module.
 * 
 * Then, to dynamically invoke the reducer for any STType, you do the following:
 * 
 * reducerMap.reduce(type);
 * 
 * The type's class (via the constructor property) is used to choose the appropriate function,
 * then invoke it on the instance.
 * 
 * 
 * Once we reimplement this in Ren, we can forego this stuff and simply do the following:
 * 
 * export func reduce(dynamic STXType type) => { ... }
 * ...
 * reduce(type)
 * 
 * And the language's built-in dynamic dispatch will work effectively the same way as this class.
 */
export default class ReducerMap<From extends CSTNode, To extends ASTNode> extends Map<Class<From>, Reducer<From, To>> {
    constructor() {
        super();
    }

    /**
     * Adds a reducer function mapping two specific CST and AST nodes to this map,
     * returning the added function.
     */
    add<F extends From, T extends To>(key: Class<F>, value: Reducer<F, T>): Reducer<F, T> {
        super.set(key, value);
        return value;
    }

    reduce(node: From) {
        const reducer = this.get(node.constructor as Class<From>) as Reducer<From, To>;
        return reducer(node);
    }
}
