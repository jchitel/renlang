import { expect } from 'chai';

import * as oper from '../../src/runtime/operators';
import { TInteger, TFloat, TChar, TBool, TArray, TFunction, TUnknown, TAny } from '../../src/typecheck/types';


describe('Operator Classes', () => {
    it('should get operator', () => {
        expect(oper.getOperatorMetadata('+', 'infix').cls).to.eql(oper.PlusOperator);
        expect(oper.getOperatorMetadata('!', 'prefix').cls).to.eql(oper.NotOperator);
        expect(oper.getOperatorMetadata('--', 'postfix').cls).to.eql(oper.PostfixDecrementOperator);
    });

    // PREFIX

    describe('UnaryPlusOperator (getSignedNumericUnaryOperatorType() and getNumericUnaryOperatorType() and getSignedUpgradeSize())', () => {
        it('should infer type of UnaryPlusOperator', () => {
            // non-numeric type -> unknown
            expect(new oper.UnaryPlusOperator(new TChar()).functionType).to.eql(new TUnknown());
            // float type -> (float) => float
            expect(new oper.UnaryPlusOperator(new TFloat(64)).functionType).to.eql(new TFunction([new TFloat(64)], new TFloat(64)));
            // unsigned integer type -> (unsigned) => signed upgrade
            expect(new oper.UnaryPlusOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(32, true)));
            // unsigned 64-bit integer type -> (unsigned 64) => signed 64
            expect(new oper.UnaryPlusOperator(new TInteger(64, false)).functionType).to.eql(new TFunction([new TInteger(64, false)], new TInteger(64, true)));
            // signed integer type -> (signed) => signed
            expect(new oper.UnaryPlusOperator(new TInteger(32, true)).functionType).to.eql(new TFunction([new TInteger(32, true)], new TInteger(32, true)));
        });
    });

    describe('UnaryMinusOperator', () => {
        it('should infer type of UnaryMinusOperator', () => {
            expect(new oper.UnaryMinusOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(32, true)));
        });
    });

    describe('NotOperator', () => {
        it('should infer type of NotOperator', () => {
            expect(new oper.NotOperator(new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.NotOperator(new TBool()).functionType).to.eql(new TFunction([new TBool()], new TBool()));
        });
    });

    describe('BitwiseNotOperator', () => {
        it('should infer type of BitwiseNotOperator', () => {
            expect(new oper.BitwiseNotOperator(new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseNotOperator(new TInteger(32, true)).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseNotOperator(new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false)], new TInteger(32, false)));
        });
    });

    describe('PrefixIncrementOperator', () => {
        it('should infer type of PrefixIncrementOperator', () => {
            expect(new oper.PrefixIncrementOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(16, false)));
        });
    });

    describe('PrefixDecrementOperator', () => {
        it('should infer type of PrefixDecrementOperator', () => {
            expect(new oper.PrefixDecrementOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(16, false)));
        });
    });

    // POSTFIX

    describe('PostfixIncrementOperator', () => {
        it('should infer type of PostfixIncrementOperator', () => {
            expect(new oper.PostfixIncrementOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(16, false)));
        });
    });

    describe('PostfixDecrementOperator', () => {
        it('should infer type of PostfixDecrementOperator', () => {
            expect(new oper.PostfixDecrementOperator(new TInteger(16, false)).functionType).to.eql(new TFunction([new TInteger(16, false)], new TInteger(16, false)));
        });
    });

    // INFIX

    describe('PlusOperator (getNumericBinaryOperatorType())', () => {
        it('should infer type of PlusOperator', () => {
            // non-numeric types
            expect(new oper.PlusOperator(new TChar(), new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.PlusOperator(new TFloat(64), new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.PlusOperator(new TChar(), new TFloat(64)).functionType).to.eql(new TUnknown());
            // floats
            expect(new oper.PlusOperator(new TFloat(32), new TFloat(64)).functionType).to.eql(new TFunction([new TFloat(32), new TFloat(64)], new TFloat(64)));
            expect(new oper.PlusOperator(new TFloat(32), new TFloat(32)).functionType).to.eql(new TFunction([new TFloat(32), new TFloat(32)], new TFloat(32)));
            // signed integers
            expect(new oper.PlusOperator(new TInteger(32, true), new TInteger(64, true)).functionType).to.eql(new TFunction([new TInteger(32, true), new TInteger(64, true)], new TInteger(64, true)));
            expect(new oper.PlusOperator(new TInteger(32, true), new TInteger(32, true)).functionType).to.eql(new TFunction([new TInteger(32, true), new TInteger(32, true)], new TInteger(32, true)));
            // signed integer > unsigned integer
            expect(new oper.PlusOperator(new TInteger(32, false), new TInteger(64, true)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(64, true)], new TInteger(64, true)));
            expect(new oper.PlusOperator(new TInteger(64, true), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(64, true), new TInteger(32, false)], new TInteger(64, true)));
            // signed integer <= unsigned integer
            expect(new oper.PlusOperator(new TInteger(32, true), new TInteger(64, false)).functionType).to.eql(new TFunction([new TInteger(32, true), new TInteger(64, false)], new TInteger(64, true)));
            expect(new oper.PlusOperator(new TInteger(32, true), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, true), new TInteger(32, false)], new TInteger(64, true)));
            // int and float
            expect(new oper.PlusOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
            expect(new oper.PlusOperator(new TFloat(64), new TInteger(32, false)).functionType).to.eql(new TFunction([new TFloat(64), new TInteger(32, false)], new TFloat(64)));
        });

        it('should infer type of concatenating PlusOperator', () => {
            // no relationship
            expect(new oper.PlusOperator(new TArray(new TBool()), new TArray(new TChar())).functionType).to.eql(new TUnknown());
            // relationship
            expect(new oper.PlusOperator(new TArray(new TChar()), new TArray(new TChar())).functionType).to.eql(new TFunction([new TArray(new TChar()), new TArray(new TChar())], new TArray(new TChar())));
        });
    });

    describe('MinusOperator', () => {
        it('should infer type of MinusOperator', () => {
            expect(new oper.MinusOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('MultiplyOperator', () => {
        it('should infer type of MultiplyOperator', () => {
            expect(new oper.MultiplyOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('DivideOperator', () => {
        it('should infer type of DivideOperator', () => {
            expect(new oper.DivideOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('ModuloOperator', () => {
        it('should infer type of ModuloOperator', () => {
            expect(new oper.ModuloOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('BitwiseAndOperator (getBitwiseBinaryOperatorType())', () => {
        it('should infer type of BitwiseAndOperator', () => {
            // non-integer
            expect(new oper.BitwiseAndOperator(new TChar(), new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseAndOperator(new TInteger(32, false), new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseAndOperator(new TChar(), new TInteger(32, false)).functionType).to.eql(new TUnknown());
            // signed integer
            expect(new oper.BitwiseAndOperator(new TInteger(32, true), new TInteger(32, true)).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseAndOperator(new TInteger(32, true), new TInteger(32, false)).functionType).to.eql(new TUnknown());
            expect(new oper.BitwiseAndOperator(new TInteger(32, false), new TInteger(32, true)).functionType).to.eql(new TUnknown());
            // unequal sized integers
            expect(new oper.BitwiseAndOperator(new TInteger(32, false), new TInteger(64, false)).functionType).to.eql(new TUnknown());
            // correct
            expect(new oper.BitwiseAndOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
        });
    });

    describe('BitwiseOrOperator', () => {
        it('should infer type of BitwiseOrOperator', () => {
            expect(new oper.BitwiseOrOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
        });
    });

    describe('AndOperator (getBooleanBinaryOperatorType())', () => {
        it('should infer type of AndOperator', () => {
            // non-boolean
            expect(new oper.AndOperator(new TChar(), new TChar()).functionType).to.eql(new TUnknown());
            expect(new oper.AndOperator(new TChar(), new TBool()).functionType).to.eql(new TUnknown());
            expect(new oper.AndOperator(new TBool(), new TChar()).functionType).to.eql(new TUnknown());
            // correct
            expect(new oper.AndOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('OrOperator', () => {
        it('should infer type of OrOperator', () => {
            expect(new oper.OrOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('XorOperator', () => {
        it('should infer type of XorOperator', () => {
            // bitwise
            expect(new oper.XorOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
            // boolean
            expect(new oper.XorOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('PlusAssignmentOperator', () => {
        it('should infer type of PlusAssignmentOperator', () => {
            expect(new oper.PlusAssignmentOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });

        it('should infer type of concatenating PlusAssignmentOperator', () => {
            // no relationship
            expect(new oper.PlusAssignmentOperator(new TArray(new TBool()), new TArray(new TChar())).functionType).to.eql(new TUnknown());
            // relationship
            expect(new oper.PlusAssignmentOperator(new TArray(new TChar()), new TArray(new TChar())).functionType).to.eql(new TFunction([new TArray(new TChar()), new TArray(new TChar())], new TArray(new TChar())));
        });
    });

    describe('MinusAssignmentOperator', () => {
        it('should infer type of MinusAssignmentOperator', () => {
            expect(new oper.MinusAssignmentOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('MultiplyAssignmentOperator', () => {
        it('should infer type of MultiplyAssignmentOperator', () => {
            expect(new oper.MultiplyAssignmentOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('DivideAssignmentOperator', () => {
        it('should infer type of DivideAssignmentOperator', () => {
            expect(new oper.DivideAssignmentOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('ModuloAssignmentOperator', () => {
        it('should infer type of ModuloAssignmentOperator', () => {
            expect(new oper.ModuloAssignmentOperator(new TInteger(32, false), new TFloat(64)).functionType).to.eql(new TFunction([new TInteger(32, false), new TFloat(64)], new TFloat(64)));
        });
    });

    describe('BitwiseAndAssignmentOperator', () => {
        it('should infer type of BitwiseAndAssignmentOperator', () => {
            expect(new oper.BitwiseAndAssignmentOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
        });
    });

    describe('BitwiseOrAssignmentOperator', () => {
        it('should infer type of BitwiseOrAssignmentOperator', () => {
            expect(new oper.BitwiseOrAssignmentOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
        });
    });

    describe('AndAssignmentOperator', () => {
        it('should infer type of AndAssignmentOperator', () => {
            expect(new oper.AndAssignmentOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('OrAssignmentOperator', () => {
        it('should infer type of OrAssignmentOperator', () => {
            expect(new oper.OrAssignmentOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('XorAssignmentOperator', () => {
        it('should infer type of XorAssignmentOperator', () => {
            // bitwise
            expect(new oper.XorAssignmentOperator(new TInteger(32, false), new TInteger(32, false)).functionType).to.eql(new TFunction([new TInteger(32, false), new TInteger(32, false)], new TInteger(32, false)));
            // boolean
            expect(new oper.XorAssignmentOperator(new TBool(), new TBool()).functionType).to.eql(new TFunction([new TBool(), new TBool()], new TBool()));
        });
    });

    describe('LessThanOperator (getComparisonOperatorType())', () => {
        it('should infer type of LessThanOperator', () => {
            // non-numeric, non-char
            expect(new oper.LessThanOperator(new TBool(), new TBool()).functionType).to.eql(new TUnknown());
            // numeric
            expect(new oper.LessThanOperator(new TInteger(32, true), new TInteger(32, true)).functionType).to.eql(new TFunction([new TInteger(32, true), new TInteger(32, true)], new TBool()));
            expect(new oper.LessThanOperator(new TInteger(32, true), new TFloat(32)).functionType).to.eql(new TFunction([new TInteger(32, true), new TFloat(32)], new TBool()));
            expect(new oper.LessThanOperator(new TFloat(32), new TInteger(32, true)).functionType).to.eql(new TFunction([new TFloat(32), new TInteger(32, true)], new TBool()));
            expect(new oper.LessThanOperator(new TFloat(32), new TFloat(32)).functionType).to.eql(new TFunction([new TFloat(32), new TFloat(32)], new TBool()));
            // char
            expect(new oper.LessThanOperator(new TChar(), new TChar()).functionType).to.eql(new TFunction([new TChar(), new TChar()], new TBool()));
        });
    });

    describe('GreaterThanOperator', () => {
        it('should infer type of GreaterThanOperator', () => {
            expect(new oper.GreaterThanOperator(new TChar(), new TChar()).functionType).to.eql(new TFunction([new TChar(), new TChar()], new TBool()));
        });
    });

    describe('LessThanOrEqualToOperator', () => {
        it('should infer type of LessThanOrEqualToOperator', () => {
            expect(new oper.LessThanOrEqualToOperator(new TChar(), new TChar()).functionType).to.eql(new TFunction([new TChar(), new TChar()], new TBool()));
        });
    });

    describe('GreaterThanOrEqualToOperator', () => {
        it('should infer type of GreaterThanOrEqualToOperator', () => {
            expect(new oper.GreaterThanOrEqualToOperator(new TChar(), new TChar()).functionType).to.eql(new TFunction([new TChar(), new TChar()], new TBool()));
        });
    });

    describe('EqualsOperator (getEqualityOperatorType())', () => {
        it('should infer type of EqualsOperator', () => {
            // no relationship
            expect(new oper.EqualsOperator(new TChar(), new TBool()).functionType).to.eql(new TUnknown());
            // relationship
            expect(new oper.EqualsOperator(new TFloat(64), new TFloat(32)).functionType).to.eql(new TFunction([new TFloat(64), new TFloat(32)], new TBool()));
            // equivalent
            expect(new oper.EqualsOperator(new TFloat(64), new TFloat(64)).functionType).to.eql(new TFunction([new TFloat(64), new TFloat(64)], new TBool()));
        });
    });

    describe('NotEqualOperator', () => {
        it('should infer type of NotEqualOperator', () => {
            expect(new oper.NotEqualOperator(new TFloat(64), new TFloat(32)).functionType).to.eql(new TFunction([new TFloat(64), new TFloat(32)], new TBool()));
        });
    });

    describe('ApplyOperator', () => {
        it('should infer type of ApplyOperator', () => {
            // not function
            expect(new oper.ApplyOperator(new TChar(), new TAny())).to.eql(new TUnknown());
            // no first param
            expect(new oper.ApplyOperator(new TFunction([], new TAny()), new TAny())).to.eql(new TUnknown());
            // non-assignable first param
            expect(new oper.ApplyOperator(new TFunction([new TChar()], new TAny()), new TBool())).to.eql(new TUnknown());
            // single param
            expect(new oper.ApplyOperator(new TFunction([new TChar()], new TBool()), new TChar())).to.eql(new TFunction([new TFunction([new TChar()], new TBool()), new TChar()], new TBool()));
            // multiple params
            expect(new oper.ApplyOperator(new TFunction([new TChar(), new TChar()], new TBool()), new TChar())).to.eql(new TFunction([new TFunction([new TChar(), new TChar()], new TBool()), new TChar()], new TFunction([new TChar()], new TBool())));
        });
    });
});
