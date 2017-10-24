import TGeneric from './TGeneric';
import TType from './TType';


/**
 * Represents a "specification" of a generic type,
 * with type params filled in.
 * TODO: we don't really know what's needed here
 */
export default class TSpecific /*extends TType*/ {
    generic: TGeneric;
    type: TType;

    constructor(generic: TGeneric, type: TType) {
        //super();
        this.generic = generic;
        this.type = type;
    }

    isAssignableFrom(_t: TType) {
        // TODO
    }
}
