import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '~/typecheck/TypeCheckContext';
import TParam, { TParams } from './TParam';
import OrderedMap from '~/utils/OrderedMap';
import TInferred from './TInferred';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';
import InferTypeArgsVisitor from '~/typecheck/visitors/InferTypeArgsVisitor';


/**
 * Function type, represented by a group of parameter types and a single return type.
 */
export default class TFunction extends TType {
    public typeParams: TParams;

    /**
     * Private constructor, use TFunction.create() instead.
     */
    constructor(
        public paramTypes: TType[],
        public returnType: TType,
        public location?: Location,
        typeParams: OrderedMap<TParam> = new OrderedMap()) {
        super();
        this.typeParams = new TParams(typeParams);
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitFunction(this, param);
    }

    /**
     * Lambdas can omit types for parameters and must omit them for return types,
     * so here is where we know the expected type of the function and can fill in the blanks.
     * We assume here that type checking has already been done, so all we do here is fill in the types.
     */
    completeResolution(explicitType: TType) {
        const paramTypes = explicitType.getParams();
        for (let i = 0; i < this.paramTypes.length; ++i) {
            if (this.paramTypes[i] instanceof TInferred) this.paramTypes[i] = paramTypes[i];
        }
        this.returnType = explicitType.getReturnType();
    }

    /**
     * Given a list of argument types used to call this function,
     * infer and return the list of corresponding type argument types.
     * This is a fairly complex process, but effectively it involves
     * visiting the parameter types with the argument types,
     * and whenever a type parameter type is encountered, the corresponding
     * type in the argument type is assigned as the type parameter type.
     * 
     * NOTE: This method assumes that the argument types are at least assignable
     * to the parameter types, so it is necessary to verify assignability BEFORE
     * calling this.
     */
    inferTypeArgumentTypes(argTypes: TType[]) {
        // map of type param name -> inferred type arg
        const argMap: SymbolTable<TType> = {};
        for (const key of this.typeParamTypes.keys()) {
            // start with never because it is assignable to everything
            argMap[key] = new TNever();
        }
        // visit each parameter type
        for (let i = 0; i < this.paramTypes.length; ++i) {
            this.paramTypes[i].visit(new InferTypeArgsVisitor(argMap, argTypes[i]));
        }
        return this.typeParamTypes.keys().map(k => argMap[k]);
    }

    /**
     * Given a list of type arguments for this function, fill in the parameter types
     * and return the list of resulting parameter types.
     */
    getSpecificParamTypes(typeArgTypes: TType[]) {
        // create map of type param name -> provided type arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < typeArgTypes.length; ++i) {
            const name = this.typeParamTypes.getKey(i);
            argMap[name] = this.typeParamTypes.get(name).createTypeArg(typeArgTypes[i]);
        }
        // visit each param type with the map so that type params can be replaced with actual types
        return this.paramTypes.map(type => type.clone().specifyTypeParams(argMap));
    }

    /**
     * Given a list of type arguments for this function, fill in the return type
     * and return the resulting return type.
     */
    getSpecificReturnType(typeArgTypes: TType[]) {
        // create map of type param name -> provided type arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < typeArgTypes.length; ++i) {
            const name = this.typeParamTypes.getKey(i);
            argMap[name] = this.typeParamTypes.get(name).createTypeArg(typeArgTypes[i]);
        }
        // visit the return type with the map so that type params can be replaced with actual types
        return this.returnType.clone().specifyTypeParams(argMap);
    }

    toString() {
        return `(${this.paramTypes.map(p => p.toString()).join(', ')}) => ${this.returnType}`;
    }
}