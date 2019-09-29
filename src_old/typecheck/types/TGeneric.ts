import TType from './TType';
import TParam, { TParams } from './TParam';
import { SymbolTable } from '~/typecheck/TypeCheckContext';
import OrderedMap from '~/utils/OrderedMap';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Represents a type with type params.
 * 'typeParams' is an object mapping the type parameter names to TParam types.
 * 'type' is the definition of the type, which makes use of the type parameters.
 */
export default class TGeneric extends TType {
    typeParams: TParams;

    constructor(typeParams: OrderedMap<TParam>, public type: TType, public location?: Location) {
        super();
        this.typeParams = new TParams(typeParams);
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitGeneric(this, param);
    }

    /**
     * Here, we need to clone the type definition and visit it, specifying
     * all instances of TParam. This is where we check the type constraint.
     */
    specifyGenericType(args: TType[]) {
        const specific = this.type.clone();
        // create map of param name -> provided arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < args.length; ++i) {
            const name = this.typeParams.getKey(i);
            argMap[name] = this.typeParams.get(name).createTypeArg(args[i]);
        }
        // visit the type with the map so that params can be replaced with actual types
        return specific.specifyTypeParams(argMap);
    }
}

/**
 * An overloaded generic type is the "union" of types
 * with the same name. When resolving a module-scoped
 * type, if there are more than one type of the given
 * name, they will be grouped in an overloaded generic
 * type.
 * 
 * Where overloaded generics differ from overloaded
 * functions is that a type with no type parameters
 * is never "invoked" (made specific). It is just used.
 * So when an overloaded generic is "used" in any way
 * that is not specifying type parameters, it is as if
 * the non-generic overload is being used, so that is
 * how it will behave (only if a non-generic overload
 * is present).
 */
export class TOverloadedGeneric extends TType {
    constructor(public types: TType[], public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitOverloadedGeneric(this, param);
    }

    /**
     * In normal type operations, all that is required from
     * this is the parameter-less type, if there is one.
     */
    getParamLessType(): TType | undefined {
        return this.types.filter(t => !t.isGeneric())[0];
    }
}
