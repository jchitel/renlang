import { TType } from './types';


export const MODULE_PATH_NOT_EXIST = (path: string) => `Module "${path}" does not exist`;
export const MODULE_DOESNT_EXPORT_NAME = (path: string, name: string) => `Module "${path}" does not have an export with name "${name}"`;
export const NAME_CLASH = (name: string) => `A value with name "${name}" is already declared`;
export const EXPORT_CLASH = (name: string) => `An export with name "${name}" is already declared`;
export const VALUE_NOT_DEFINED = (name: string) => `Value "${name}" is not defined`;
export const TYPE_NOT_DEFINED = (name: string) => `Type "${name}" is not defined`;
export const CIRCULAR_DEPENDENCY = 'Cannot resolve type, circular dependency found';
export const TYPE_MISMATCH = (actual: TType, expected: string) => `Type "${actual}" is not assignable to type "${expected}"`;
export const INVALID_BREAK_STATEMENT = '"break" statement cannot be present outside loop';
export const INVALID_LOOP_NUM = (actual: number, expected: number) => `Invalid loop number ${actual} in loop with depth ${expected}`;
export const INVALID_CONTINUE_STATEMENT = '"continue" statement cannot be present outside loop';
export const INVALID_UNARY_OPERATOR = (oper: string, type: TType) => `Operator "${oper}" does not operate on type "${type}"`;
export const INVALID_BINARY_OPERATOR = (oper: string, left: TType, right: TType) => `Operator "${oper}" does not operate on types "${left}" and "${right}"`;
export const NOT_INVOKABLE = 'Cannot invoke a value that is not a function';
export const NOT_STRUCT = 'Cannot access field of a value that is not a struct';
export const NOT_ARRAY = 'Cannot access index of a value that is not an array';
export const CONFLICTING_ASSOCIATIVITY = (oper1: string, oper2: string) => `Precedence order between operators "${oper1}" and "${oper2}" could not be established because they have conflicting associativity`;
export const INVALID_ARG_COUNT = (expected: number, actual: number) => `Invalid argument count: expected ${expected}, actual ${actual}`;
export const NOT_GENERIC = (name: string) => `Type "${name}" is not generic`;
export const NOT_GENERIC_FUNCTION = 'Function is not generic';
export const INVALID_TYPE_ARG = (type: TType, name: string, constraint: TType) => `Type "${type}" is not assignable to type parameter "${name}" with constraint "${constraint}"`;
export const INVALID_TYPE_ARG_COUNT = (expected: number, actual: number) => `Invalid type argument count: expected ${expected}, actual ${actual}`;
