import { expect } from 'chai';

import {
    TType, TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray,
    TFunction, TUnion, TAny, TUnknown, determineGeneralType
} from '../../src/typecheck/types';


const Types = {
    TType, TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray,
    TFunction, TUnion, TAny
};

function getSuperClass(c: Class<any>) {
    // the inheritance chain for a class is established via the prototype of the function prototype,
    // and the class of a given prototype is accessible via the constructor property
    return Object.getPrototypeOf(c.prototype).constructor;
}

describe('Typecheck Type Classes', () => {
    it('should be assignable from TUnknown', () => {
        // for each TType class, it should be assignable from TUnknown
        for (const t of Object.values(Types)) {
            if (t !== TUnknown && typeof(t) === 'function' && getSuperClass(t as Class<TType>) === TType) {
                expect(new (t as Class<TType>)().isAssignableFrom(new TUnknown())).to.eql(true);
            }
        }
    });

    describe('TInteger', () => {
        it('should not be assignable from non-integer', () => {
            const int = new TInteger(1, true);
            expect(int.isAssignableFrom(new TFloat())).to.eql(false);
        });

        it('should not allow assigning signed ints to unsigned ints', () => {
            const int = new TInteger(1, false);
            expect(int.isAssignableFrom(new TInteger(1, true))).to.eql(false);
        });

        it('should not allow assigning ints to smaller ints', () => {
            const int = new TInteger(1, true);
            expect(int.isAssignableFrom(new TInteger(2, true))).to.eql(false);
        });

        it('should not allow assigning unsigned ints to signed ints of the same size', () => {
            const int = new TInteger(1, true);
            expect(int.isAssignableFrom(new TInteger(1, false))).to.eql(false);
        });

        it('should allow assigning valid ints', () => {
            const int = new TInteger(4, true);
            expect(int.isAssignableFrom(new TInteger(1, true))).to.eql(true);
            expect(int.isAssignableFrom(new TInteger(3, false))).to.eql(true);
            expect(int.isAssignableFrom(new TInteger(4, true))).to.eql(true);
        });
    });

    describe('TFloat', () => {
        it('should not be assignable from non-float', () => {
            const float = new TFloat(64);
            expect(float.isAssignableFrom(new TInteger())).to.eql(false);
        });

        it('should not allow assigning floats to smaller floats', () => {
            const float = new TFloat(32);
            expect(float.isAssignableFrom(new TFloat(64))).to.eql(false);
        });

        it('should allow assigning valid floats', () => {
            const float = new TFloat(64);
            expect(float.isAssignableFrom(new TFloat(64))).to.eql(true);
            expect(float.isAssignableFrom(new TFloat(32))).to.eql(true);
        });
    });

    describe('TChar', () => {
        it('should only allow assigning from other chars', () => {
            const char = new TChar();
            expect(char.isAssignableFrom(new TInteger())).to.eql(false);
            expect(char.isAssignableFrom(new TChar())).to.eql(true);
        });
    });

    describe('TBool', () => {
        it('should only allow assigning from other bools', () => {
            const char = new TBool();
            expect(char.isAssignableFrom(new TInteger())).to.eql(false);
            expect(char.isAssignableFrom(new TBool())).to.eql(true);
        });
    });

    describe('TTuple', () => {
        it('should not be assignable from non-tuple', () => {
            expect(new TTuple().isAssignableFrom(new TStruct())).to.eql(false);
        });

        it('should not be assignable from different sized tuple', () => {
            expect(new TTuple([]).isAssignableFrom(new TTuple([new TBool()]))).to.eql(false);
        });

        it('should not be assignable from tuple with non-assignable component', () => {
            expect(new TTuple([new TInteger(2, true), new TChar()]).isAssignableFrom(new TTuple([new TInteger(1, false), new TBool()]))).to.eql(false);
        });

        it('should be assignable from tuple with assignable components', () => {
            expect(new TTuple([new TInteger(2, true), new TChar()]).isAssignableFrom(new TTuple([new TInteger(1, false), new TChar()]))).to.eql(true);
        });
    });

    describe('TStruct', () => {
        it('should not be assignable from non-struct', () => {
            expect(new TStruct().isAssignableFrom(new TTuple())).to.eql(false);
        });

        it('should not be assignable from struct missing a field', () => {
            const struct = new TStruct({
                key1: new TChar(),
                key2: new TInteger(),
            });
            const assign = new TStruct({
                key1: new TChar(),
            })
            expect(struct.isAssignableFrom(assign)).to.eql(false);
        });

        it('should not be assignable from struct with non-assignable field', () => {
            const struct = new TStruct({
                key1: new TChar(),
                key2: new TInteger(1, true),
            });
            const assign = new TStruct({
                key1: new TChar(),
                key2: new TInteger(1, false),
            })
            expect(struct.isAssignableFrom(assign)).to.eql(false);
        });

        it('should be assignable from tuple with assignable fields', () => {
            const struct = new TStruct({
                key1: new TChar(),
                key2: new TInteger(2, true),
            });
            const assign = new TStruct({
                key1: new TChar(),
                key2: new TInteger(1, false),
            })
            expect(struct.isAssignableFrom(assign)).to.eql(true);
            // extra fields should be ok
            assign.fields.key3 = new TBool();
            expect(struct.isAssignableFrom(assign)).to.eql(true);
        });
    });

    describe('TArray', () => {
        it('should not be assignable from non-array', () => {
            expect(new TArray(new TAny()).isAssignableFrom(new TTuple())).to.eql(false);
        });

        it('should be assignable from any array for null base type', () => {
            // TODO
            //expect(new TArray(null).isAssignableFrom(new TArray(new TBool()))).to.eql(true);
        });

        it('should only be assignable if base type is assignable', () => {
            expect(new TArray(new TInteger(1, true)).isAssignableFrom(new TArray(new TInteger(1, false)))).to.eql(false);
            expect(new TArray(new TInteger(2, true)).isAssignableFrom(new TArray(new TInteger(1, false)))).to.eql(true);
        });
    });

    describe('TFunction', () => {
        it('should not be assignable from non-function', () => {
            expect(new TFunction([], new TAny()).isAssignableFrom(new TStruct())).to.eql(false);
        });

        it('should not be assignable from different param number', () => {
            expect(new TFunction([new TBool()], new TAny()).isAssignableFrom(new TFunction([new TBool(), new TBool()], new TAny()))).to.eql(false);
        });

        it('should allow assignability when return type is implicit', () => {
            // TODO
            //expect(new TFunction([], new TBool()).isAssignableFrom(new TFunction([], null))).to.eql(true);
        });

        it('should not be assignable from non-assignable return type', () => {
            expect(new TFunction([], new TInteger(1, true)).isAssignableFrom(new TFunction([], new TInteger(1, false)))).to.eql(false);
        });

        it('should allow assignability when params are implicit', () => {
            // TODO
            //expect(new TFunction([new TInteger(1, true), new TBool()], new TTuple([])).isAssignableFrom(new TFunction([new TInteger(1, true), null], null))).to.eql(true);
        });

        it('should not be assignable from non-assignable param types', () => {
            // param type relationship is reversed, the assigning type's param types need to be assignable from the corresponding assigned type's param types.
            // this is because the assigned type will receive parameter values that are valid for the assigned parameters' types, so the assigning type's parameter types can be more generic
            expect(new TFunction([new TInteger(2, false), new TBool()], new TTuple([])).isAssignableFrom(new TFunction([new TInteger(1, false), new TBool()], new TTuple([])))).to.eql(false);
        });

        it('should be assignable from assignable param types and return type', () => {
            expect(new TFunction([new TInteger(1, false), new TBool()], new TFloat(64)).isAssignableFrom(new TFunction([new TInteger(2, false), new TBool()], new TFloat(32)))).to.eql(true);
        });

        it('should resolve type of lambda with omitted types', () => {
            // TODO
            //const lambdaType = new TFunction([new TChar(), null, new TBool()], null);
            //const explicitType = new TFunction([new TChar(), new TFloat(64), new TBool()], new TInteger(32, true));
            //lambdaType.completeResolution(explicitType);
            //expect(lambdaType).to.eql(explicitType);
        });
    });

    describe('TUnion', () => {
        it('should not be assignable from a non-subset', () => {
            expect(new TUnion([new TChar(), new TBool()]).isAssignableFrom(new TUnion([new TChar, new TFloat(64)]))).to.eql(false);
        });

        it('should be assignable from a subset', () => {
            expect(new TUnion([new TChar(), new TBool(), new TFloat(64)]).isAssignableFrom(new TUnion([new TChar, new TFloat(64)]))).to.eql(true);
        });

        it('should not be assignable from a non-element', () => {
            expect(new TUnion([new TChar(), new TBool()]).isAssignableFrom(new TUnion([new TFloat(64)]))).to.eql(false);
        });

        it('should be assignable from an element', () => {
            expect(new TUnion([new TChar(), new TBool()]).isAssignableFrom(new TChar())).to.eql(true);
        });
    });

    describe('TAny', () => {
        it('should be assignable from all types', () => {
            // for each TType class, it should be assignable to TAny
            for (const t of Object.values(Types)) {
                if (typeof(t) === 'function' && getSuperClass(t as Class<TType>) === TType) {
                    expect(new TAny().isAssignableFrom(new (t as Class<TType>)())).to.eql(true);
                }
            }
        });
    });

    describe('determineGeneralType', () => {
        it('should return the more general type of two related types', () => {
            expect(determineGeneralType(new TFloat(32), new TFloat(64))).to.eql(new TFloat(64));
            expect(determineGeneralType(new TFloat(64), new TFloat(32))).to.eql(new TFloat(64));
        });

        it('should return any for two unrelated types', () => {
            expect(determineGeneralType(new TBool(), new TChar())).to.eql(new TAny());
        });

        it('should return the type for two equivalent types', () => {
            expect(determineGeneralType(new TBool(), new TBool())).to.eql(new TBool());
        });
    });
});
