import RValue, { ReferenceValue } from './RValue';


export default class RFunction extends ReferenceValue {
    functionId: number;
    argRefs: number[];

    constructor(functionId: number, ...argRefs: number[]) {
        super();
        this.functionId = functionId;
        this.argRefs = argRefs;
    }

    equals(value: RValue<any>): boolean {
        if (!(value instanceof RFunction)) return false;
        return (this.functionId === value.functionId)
            && (JSON.stringify(this.argRefs) === JSON.stringify(value.argRefs));
    }
} 
