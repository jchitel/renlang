import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple,
    TFunction, TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive,
    TInferred, TNamespace, TOverloadedGeneric, TParams, TArgs
} from '~/typecheck/types';
import preVisit from '~/utils/preVisit';


/**
 * This is a simple visitor that deep clones a type.
 * It is intended to be overridden for different operations
 * that clone types, such as specifying generic types.
 */
@preVisit()
export default class CloneVisitor implements ITypeVisitor<TType> {
    /**
     * This pre-visitor strips the locations from the cloned types,
     * because the clones should never correspond to the same locations
     * as the originals.
     */
    preVisit(visitor: () => TType) {
        return Object.assign(visitor(), { location: undefined });
    }

    visitInteger(type: TInteger): TType {
        return type.clone();
    }

    visitFloat(type: TFloat): TType {
        return type.clone();
    }

    visitChar(type: TChar): TType {
        return type.clone();
    }
    
    visitBool(type: TBool): TType {
        return type.clone();
    }

    visitArray(type: TArray): TType {
        return Object.assign(type.clone(), {
            baseType: type.baseType.visit(this),
        });
    }

    visitStruct(type: TStruct): TType {
        return Object.assign(type.clone(), {
            fields: Object.keys(type.fields)
                .reduce((obj, k) => ({ ...obj, [k]: type.fields[k].visit(this) }), {}),
        });
    }

    visitTuple(type: TTuple): TType {
        return Object.assign(type.clone(), {
            types: type.types.map(t => t.visit(this)),
        });
    }

    visitFunction(type: TFunction): TType {
        return Object.assign(type.clone(), {
            typeParamTypes: type.typeParamTypes.map(t => t.visit(this) as TParam),
            paramTypes: type.paramTypes.map(t => t.visit(this)),
            returnType: type.returnType.visit(this),
        });
    }

    visitGeneric(type: TGeneric): TType {
        return Object.assign(type.clone(), {
            typeParams: type.typeParams.visit(this),
            type: type.type.visit(this),
        });
    }

    visitParam(type: TParam): TType {
        return Object.assign(type.clone(), {
            constraint: type.constraint ? type.constraint.visit(this) : undefined,
        });
    }

    visitParams(type: TParams): TType {
        return Object.assign(type.clone(), {
            params: type.params.map(t => t.visit(this) as TParam),
        });
    }

    visitArg(type: TArg): TType {
        return Object.assign(type.clone(), {
            type: type.type.visit(this),
        });
    }

    visitArgs(type: TArgs): TType {
        return Object.assign(type.clone(), {
            args: type.args.map(t => t.visit(this)),
        });
    }

    visitUnion(type: TUnion): TType {
        return Object.assign(type.clone(), {
            types: type.types.map(t => t.visit(this)),
        });
    }

    visitAny(type: TAny): TType {
        return type.clone();
    }

    visitNever(type: TNever): TType {
        return type.clone();
    }

    visitRecursive(type: TRecursive): TType {
        return type.clone();
    }

    visitInferred(type: TInferred): TType {
        return type.clone();
    }

    visitNamespace(type: TNamespace): TType {
        return type.clone();
    }

    visitOverloadedGeneric(type: TOverloadedGeneric): TType {
        return Object.assign(type.clone(), {
            types: type.types.map(t => t.visit(this)),
        });
    }
}