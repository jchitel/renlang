import TNever from './TNever';


/**
 * Represents an unknown type, used in error cases where the type is impossible to be determined.
 * The purpose of this type is as a placeholder so that multiple errors aren't used for the same error case.
 * It is semantically equal to 'never', meaning that it can be used for any type,
 * so as to suppress errors. But it is not an exposed type.
 */
export default class TUnknown extends TNever {
    specifyTypeParams(): never {
        throw new Error('never');
    }

    toString(): never {
        throw new Error('never');
    }
}