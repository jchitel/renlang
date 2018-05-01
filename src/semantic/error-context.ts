import { Token } from '~/parser/lexer';
import { FileRange, Diagnostic } from '~/core';
import { TType, TParam, TUnknown } from './types';
import { BreakStatement, ContinueStatement, UnaryExpression, BinaryExpression, Declaration } from '~/syntax';


/**
 * A context for adding type errors for a specific module.
 * Pass the list of errors from a TypeChecker instance.
 */
const _context = {
    // #region name resolution errors, don't need to return unknown
    noModule: (name: Token) => new Diagnostic(`Module "${name.value}" does not exist`, name.location),
    noModuleExport: (path: string, name: Token) => new Diagnostic(`Module "${path}" does not have an export with name "${name.image}"`, name.location),
    exportClash: (name: Token) => new Diagnostic(`An export with name "${name.image}" is already declared`, name.location),
    noName: (decl: Declaration) => {
        const { path, start } = decl.location;
        const location = new FileRange(path, start, start);
        return new Diagnostic('Declarations that are not part of a default export must have a name', location);
    },
    declNameClash: (name: Token) => new Diagnostic(`The name ${name.image} is already declared.`, name.location),
    // #endregion
    // #region type resolution errors, should return unknown
    circularDependency: (location: FileRange) => new Diagnostic('Circular dependency found', location),
    typeMismatch: (from: TType, to: TType, location: FileRange) => new Diagnostic(`Type "${from}" is not assignable to type "${to}"`, location),
    nameClash: (name: Token) => new Diagnostic(`A value with name "${name.image}" is already declared`, name.location),
    typeNotDefined: (name: Token) => new Diagnostic(`Type "${name.image}" is not defined`, name.location),
    valueNotDefined: (name: Token) => new Diagnostic(`Value "${name.image}" is not defined`, name.location),
    notGeneric: (location: FileRange) => new Diagnostic('Type is not generic', location),
    notArray: (location: FileRange) => new Diagnostic('Cannot access index of a value that is not an array', location),
    notNamespace: (location: FileRange) => new Diagnostic(`Type is not a namespace`, location),
    notStruct: (location: FileRange) => new Diagnostic('Cannot access field of a value that is not a struct or a namespace', location),
    notInvokable: (location: FileRange) => new Diagnostic('Cannot invoke a value that is not a function', location),
    notGenericFunction: (location: FileRange) => new Diagnostic('Function is not generic', location),
    invalidTypeArgCount: (expected: number, actual: number, location: FileRange) => new Diagnostic(`Invalid type argument count: expected ${expected}, actual ${actual}`, location),
    invalidTypeArg: (arg: TType, param: TParam, location: FileRange) => new Diagnostic(`Type "${arg}" is not assignable to type parameter "${param.name}" with constraint "${param.constraint}"`, location),
    invalidArgCount: (expected: number, actual: number, location: FileRange) => new Diagnostic(`Invalid argument count: expected ${expected}, actual ${actual}`, location),
    invalidBreak: (location: FileRange) => new Diagnostic('"break" statement cannot be present outside loop', location),
    invalidContinue: (location: FileRange) => new Diagnostic('"continue" statement cannot be present outside loop', location),
    invalidLoopNum: (expected: number, node: BreakStatement | ContinueStatement) => new Diagnostic(`Invalid loop number ${node.loopNumber} in loop with depth ${expected}`, node.location),
    invalidUnary: (exp: UnaryExpression, target: TType) => new Diagnostic(`Operator "${exp.symbol}" does not operate on type "${target}"`, exp.location),
    invalidBinary: (exp: BinaryExpression, left: TType, right: TType) => new Diagnostic(`Operator "${exp.symbol}" does not operate on types "${left}" and "${right}"`, exp.location),
    assocConflict: (oper1: string, oper2: string, location: FileRange) => new Diagnostic(`Precedence order between operators "${oper1}" and "${oper2}" could not be established because they have conflicting associativity`, location),
    // #endregion
};

export type TypeCheckErrorContext = typeof _context;
export const TypeCheckErrorContext = _context;
