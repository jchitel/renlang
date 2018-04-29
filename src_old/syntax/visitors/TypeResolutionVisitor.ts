import ITypeVisitor from '~/syntax/visitors/interfaces/ITypeVisitor';
import IExpressionVisitor from '~/syntax/visitors/interfaces/IExpressionVisitor';
import IStatementVisitor from '~/syntax/visitors/interfaces/IStatementVisitor';
import * as types from '~/typecheck/types';
import * as ast from '~/syntax';
import Scope from '~/utils/Scope';
import TypeChecker from '~/typecheck/TypeChecker';
import TypeErrorContext from '~/typecheck/TypeErrorContext';
import preVisit from '~/utils/preVisit';
import { Token } from '~/parser/Tokenizer';
import DeclarationTypeVisitor from '~/syntax/visitors/DeclarationTypeVisitor';
import SpecifyTypeVisitor from '~/typecheck/visitors/SpecifyTypeVisitor';


/**
 * Resolves the type of a node in a specific declaration.
 * This will keep track of any variables or type parameters
 * that are in scope.
 */
@preVisit()
export default class TypeResolutionVisitor implements ITypeVisitor<types.Type>, IExpressionVisitor<types.Type>, IStatementVisitor<types.Type> {
    public typeParams = new Scope<types.ParamType>();
    public params = new Scope<types.Type>();
    private error: TypeErrorContext;

    constructor(private typeChecker: TypeChecker) {
        this.error = new TypeErrorContext(typeChecker.errors);
    }

    /**
     * This pre-visitor method memoizes already-resolved types
     */
    preVisit(visitor: () => types.Type, visitee: ast.ASTNode): types.Type {
        if (visitee.type) return visitee.type;
        return visitee.type = visitor();
    }

    /**
     * Resolves the type of a named type in the current module
     */
    private getModuleType(name: Token): Optional<types.Type> {
        // resolve the module, make sure that the name exists
        const module = name.location.path;
        const names = this.typeChecker.names[module];
        if (!(name.image in names)) return null;
        // get all declarations
        const decls = names[name.image].map(({ id }) => this.typeChecker.declarations[id]);
        if (!(decls[0] instanceof ast.TypeDeclaration)) return null;
        // resolve all of the types
        const resolved: types.Type[] = decls.map(type => type.visit(new DeclarationTypeVisitor(this.typeChecker)));
        // if the name resolves to more than one type, it is overloaded
        return resolved.length === 1 ? resolved[0] : new TOverloadedGeneric(resolved);
    }

    // #region Types

    visitBuiltInType(type: ast.BuiltInType): TType {
        switch (type.typeNode) {
            case 'u8': case 'byte': return new TInteger(type.location, 8, false);
            case 'i8': return new TInteger(type.location, 8, true);
            case 'u16': case 'short': return new TInteger(type.location, 16, false);
            case 'i16': return new TInteger(type.location, 16, true);
            case 'u32': return new TInteger(type.location, 32, false);
            case 'i32': case 'integer': return new TInteger(type.location, 32, true);
            case 'u64': return new TInteger(type.location, 64, false);
            case 'i64': case 'long': return new TInteger(type.location, 64, true);
            case 'int': return new TInteger(type.location, Infinity, true);
            case 'f32': case 'float': return new TFloat(type.location, 32);
            case 'f64': case 'double': return new TFloat(type.location, 64);
            case 'char': return new TChar(type.location);
            case 'string': return new TArray(new TChar(), type.location);
            case 'bool': return new TBool(type.location);
            case 'void': return new TTuple(type.location);
            case 'any': return new TAny(type.location);
            default: throw new Error(`Invalid built-in type ${type.typeNode}`);
        }
    }

    visitIdentifierType(type: ast.IdentifierType): TType {
        // check for a type param first
        const typeParam = this.typeParams.get(type.name);
        if (typeParam) {
            return typeParam;
        } else {
            const name = Token.fromLocation(type.location, type.name);
            const moduleType = this.getModuleType(name);
            if (!moduleType) return this.error.typeNotDefined(name);
            return Object.assign(moduleType.clone(), { location: type.location });
        }
    }

    visitArrayType(type: ast.ArrayType): TType {
        return new TArray(type.baseType.visit(this), type.location);
    }

    /**
     * TODO: does it make sense for explicit function types to have type params?
     * If so, the syntax will have to be extended to allow for that...
     */
    visitFunctionType(type: ast.FunctionType): TType {
        const paramTypes = type.paramTypes.map(t => t.visit(this));
        const returnType = type.returnType.visit(this);
        return new TFunction(paramTypes, returnType, type.location);
    }

    visitParenthesizedType(type: ast.ParenthesizedType): TType {
        return type.inner.visit(this);
    }

    visitSpecificType(type: ast.SpecificType): TType {
        // resolve the TGeneric
        const genericType = type.typeNode.visit(this);
        if (!genericType.isGeneric()) return this.error.notGeneric(type.location);
        // resolve all type arguments
        const typeArgs = type.typeArgs.map(a => a.visit(this));
        // specify the type
        const visitor = new SpecifyTypeVisitor(this.typeChecker)
        const specificType = new TSpecific(genericType)

        // third, make sure the number of type arguments is correct
        const paramTypes = genericType.getTypeParams();
        const numParams = paramTypes.length;
        if (typeArgs.length !== numParams) return this.invalidTypeArgCount(numParams, typeArgs.length, type);
        // fourth, make sure each type argument is assignable to the corresponding type parameter
        for (let i = 0; i < typeArgs.length; ++i) {
            const [param, arg] = [paramTypes.getValue(i), typeArgs[i]];
            if (param.isAssignableFrom(arg)) return this.invalidTypeArg(arg, param, type.typeArgs[i]);
        }
        // fifth, specify the generic type
        return (genericType as TGeneric).specifyGenericType(typeArgs);
    }
    
    visitStructType(type: ast.StructType): TType {
        const fields: { [name: string]: TType } = {};
        for (const field of type.fields) {
            if (fields[field.name.image]) {
                fields[field.name.image] = this.error.nameClash(field.name);
            } else {
                fields[field.name.image] = field.type.visit(this);
            }
        }
        return new TStruct(type.location, fields);
    }

    visitTupleType(type: ast.TupleType): TType {
        return new TTuple(type.location, type.types.map(t => t.visit(this)));
    }

    visitUnionType(type: ast.UnionType): TType {
        return new TUnion(type.location, type.types.map(t => t.visit(this)));
    }

    visitNamespaceAccessType(type: ast.NamespaceAccessType): TType {
        const baseType = type.baseType.visit(this);
        if (!baseType.isNamespace()) return this.error.notNamespace(type.baseType.location);
        const name = type.typeName.image;
        const names = baseType.getNamespaceNames();
        // verify the type exists
        if (!(name in names)) return this.error.typeNotDefined(type.typeName);
        // get all declarations
        const decls = names[type.typeName.image].map(id => this.typeChecker.declarations[id]);
        if (!(decls[0] instanceof ast.TypeDeclaration)) return this.error.typeNotDefined(type.typeName);
        // resolve all of the types
        const resolved: TType[] = decls.map(type => type.visit(new DeclarationTypeVisitor(this.typeChecker)));
        // if the name resolves to more than one type, it is overloaded
        const nsType = resolved.length === 1 ? resolved[0] : new TOverloadedGeneric(resolved);
        return Object.assign(nsType.clone(), { location: type.location });
    }

    // #endregion
    // #region Expressions

    visitBoolLiteral(lit: ast.BoolLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitCharLiteral(lit: ast.CharLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitFloatLiteral(lit: ast.FloatLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitIntegerLiteral(lit: ast.IntegerLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitStringLiteral(lit: ast.StringLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitIdentifierExpression(exp: ast.IdentifierExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitArrayAccess(acc: ast.ArrayAccess): TType {
        throw new Error("Method not implemented.");
    }
    visitArrayLiteral(lit: ast.ArrayLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitBinaryExpression(exp: ast.BinaryExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitFieldAccess(acc: ast.FieldAccess): TType {
        throw new Error("Method not implemented.");
    }
    visitFunctionApplication(app: ast.FunctionApplication): TType {
        throw new Error("Method not implemented.");
    }
    visitIfElseExpression(exp: ast.IfElseExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitLambdaExpression(exp: ast.BaseLambdaExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitParenthesizedExpression(exp: ast.ParenthesizedExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitStructLiteral(lit: ast.StructLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitTupleLiteral(lit: ast.TupleLiteral): TType {
        throw new Error("Method not implemented.");
    }
    visitUnaryExpression(exp: ast.UnaryExpression): TType {
        throw new Error("Method not implemented.");
    }
    visitVarDeclaration(decl: ast.VarDeclaration): TType {
        throw new Error("Method not implemented.");
    }

    // #endregion
    // #region Statements

    visitBlock(block: ast.Block): TType {
        throw new Error("Method not implemented.");
    }
    visitExpressionStatement(exp: ast.ExpressionStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitBreakStatement(stmt: ast.BreakStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitContinueStatement(stmt: ast.ContinueStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitDoWhileStatement(stmt: ast.DoWhileStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitForStatement(stmt: ast.ForStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitReturnStatement(stmt: ast.ReturnStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitThrowStatement(stmt: ast.ThrowStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitTryCatchStatement(stmt: ast.TryCatchStatement): TType {
        throw new Error("Method not implemented.");
    }
    visitWhileStatement(stmt: ast.WhileStatement): TType {
        throw new Error("Method not implemented.");
    }

    // #endregion
}