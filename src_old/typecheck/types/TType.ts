import { SymbolTable } from '~/typecheck/TypeCheckContext';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import ASTNode from '~/syntax/ASTNode';
import AssignmentVisitor from '~/typecheck/visitors/AssignmentVisitor';
import SpecifyTypeVisitor from '~/typecheck/visitors/SpecifyTypeVisitor';
import * as visitors from '~/typecheck/visitors/IsVisitors';
import { Location } from '~/parser/Tokenizer';


/**
 * Base class of all type checking types.
 * These types contain all logic for identifying the types
 * of declarations and expressions, as well as relationships
 * between types.
 */
export default abstract class TType {
    abstract location?: Location;

    abstract visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P): T;

    /**
     * Determines if a type can be assigned to this type.
     * @see visitors.AssignmentVisitor
     */
    isAssignableFrom(from: TType) {
        return this.visit(new AssignmentVisitor(from));
    }

    assertAssignableFrom(from: TType, node: ASTNode) {
        // never and inferred types are assignable to all types
        if (from.isNever() || from.constructor.name === 'TInferred') return true;
        return this.visit(new AssertAssignmentVisitor(from, node));
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        return this.visit(new SpecifyTypeVisitor(args));
    }

    /**
     * BEHAVIORAL APIS
     * These APIs allow us to have complex types that still boil down to basic types.
     * This is so that we don't have to do obnoxious instanceof checks.
     */
    isInteger() { return this.visit(new visitors.IsIntegerVisitor()); }
    isFloat() { return this.visit(new visitors.IsFloatVisitor()); }
    isChar() { return this.visit(new visitors.IsCharVisitor()); }
    isBool() { return this.visit(new visitors.IsBoolVisitor()); }
    isArray() { return this.visit(new visitors.IsArrayVisitor()); }
    isStruct() { return this.visit(new visitors.IsStructVisitor()); }
    isTuple() { return this.visit(new visitors.IsTupleVisitor()); }
    isFunction() { return this.visit(new visitors.IsFunctionVisitor()); }
    isGeneric() { return this.visit(new visitors.IsGenericVisitor()); }
    isNamespace() { return this.visit(new visitors.IsNamespaceVisitor()); }
    isNever() { return this.visit(new visitors.IsNeverVisitor()); }

    isSigned() { return this.visit(new visitors.IsSignedVisitor()); }
    hasField(field: string) { return this.visit(new visitors.HasFieldVisitor(field)); }

    getSize() { return this.visit(new visitors.GetSizeVisitor()); }
    getBaseType(): TType { return this.visit(new visitors.GetBaseTypeVisitor()); }
    getFields() { return this.visit(new visitors.GetFieldsVisitor()); }
    getField(field: string) { return this.visit(new visitors.GetFieldVisitor(field)); }
    getTupleTypes() { return this.visit(new visitors.GetTupleTypesVisitor()); }
    getParams() { return this.visit(new visitors.GetParamsVisitor()); }
    getTypeParams() { return this.visit(new visitors.GetTypeParamsVisitor()); }
    getReturnType() { return this.visit(new visitors.GetReturnTypeVisitor()); }
    getNamespaceNames() { return this.visit(new visitors.GetNamespaceNamesVisitor()); }

    /**
     * Return an exact (shallow) copy of this instance
     */
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}
