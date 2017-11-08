import TType from './TType';
import TParam from './TParam';
import { SymbolTable } from '~/typecheck/TypeCheckContext';
import OrderedMap from './OrderedMap';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * Represents a type with type params.
 * 'typeParams' is an object mapping the type parameter names to TParam types.
 * 'type' is the definition of the type, which makes use of the type parameters.
 */
export default class TGeneric extends TType {
    typeParams: OrderedMap<TParam>;
    type: TType;

    constructor(typeParams: OrderedMap<TParam>, type: TType) {
        super();
        this.typeParams = typeParams;
        this.type = type;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitGeneric(this);
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