import { TType, TParam } from './types';


export type SymbolTable<T> = { [symbol: string]: T };

/**
 * This class provides a context for type checking,
 * including the values of all symbols and control values
 * required for type checking.
 * This should be passed to the getType()/resolveType() methods
 * for all types, expressions, and statements.
 */
export default class TypeCheckContext {
    symbolTable: SymbolTable<TType> = {};
    typeParams: SymbolTable<TParam> = {};
    loopNumber: number = -1;

    clone() {
        return Object.assign(new TypeCheckContext(), {
            symbolTable: { ...this.symbolTable },
            typeParams: { ...this.typeParams },
            loopNumber: this.loopNumber,
        });
    }
}