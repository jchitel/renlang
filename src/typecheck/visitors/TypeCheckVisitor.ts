import ASTNode from '~/syntax/ASTNode';
import { Location } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TInferred,
    TFunction, TUnion, TGeneric, TParam, TAny, TNever, TUnknown, determineGeneralType } from '~/typecheck/types';
import Module from '~/runtime/Module';
import TypeChecker from '~/typecheck/TypeChecker';
import TypeCheckContext, { SymbolTable } from '~/typecheck/TypeCheckContext';
import * as mess from '~/typecheck/TypeCheckerMessages';
import OrderedMap from '~/typecheck/types/OrderedMap';
import { createUnary, createBinary } from '~/runtime/operators';
import * as ast from '~/syntax';


/**
 * All of the actual type checking logic resides here.
 * There is a visitor method for each AST node type.
 * 
 * TODO: we don't handle scopes properly:
 * - symbols aren't removed from the symbol table when they fall out of scope.
 *   to resolve this we can do what the translator and interpreter do with a scope stack.
 *   we need to do this for both variables and type parameters.
 * - similarly to this, when we start resolution for a lambda expression, we replace
 *   the context. this will 100% break everything because the context of the containing
 *   function is overwritten. we can also resolve this using a stack of contexts
 *   (or perhaps merge this into the stack that contexts will use)
 */
export default class TypeCheckVisitor implements INodeVisitor<TType> {
    typeChecker: TypeChecker;
    context: TypeCheckContext;
    module: Module;

    constructor(typeChecker: TypeChecker, module: Module) {
        this.typeChecker = typeChecker;
        this.module = module;
    }

    /**
     * Resolves the type of a named type in the current module
     */
    getModuleType(name: string) {
        return this.typeChecker.getType(this.module, name);
    }

    /**
     * Resolves the type of a named value in the current module
     */
    getModuleValueType(name: string) {
        return this.typeChecker.getValueType(this.module, name);
    }

    /*****************
     * ERROR HELPERS *
     *****************/

    /**
     * Adds a type checking error with the specified message and location.
     * Returns a resolved type, this type defaults to Unknown
     */
    pushError(message: string, location: Location, resolvedType: TType = new TUnknown()) {
        return this.typeChecker.pushError(message, this.module.path, location, resolvedType);
    }

    typeMismatch(actual: TType, expected: string, node: ASTNode) {
        return this.pushError(mess.TYPE_MISMATCH(actual, expected), node.locations.self);
    }

    nameClash(name: string, location: Location) {
        return this.pushError(mess.NAME_CLASH(name), location);
    }

    typeNotDefined(name: string, node: ASTNode) {
        return this.pushError(mess.TYPE_NOT_DEFINED(name), node.locations.self);
    }

    valueNotDefined(name: string, location: Location) {
        return this.pushError(mess.VALUE_NOT_DEFINED(name), location);
    }

    notGeneric(node: ASTNode) {
        return this.pushError(mess.NOT_GENERIC, node.locations.self);
    }

    notArray(node: ASTNode) {
        return this.pushError(mess.NOT_ARRAY, node.locations.self);
    }

    notNamespace(name: string, node: ASTNode) {
        return this.pushError(mess.NOT_NAMESPACE(name), node.locations.self);
    }

    notStruct(node: ASTNode) {
        return this.pushError(mess.NOT_STRUCT, node.locations.self);
    }

    notInvokable(node: ASTNode) {
        return this.pushError(mess.NOT_INVOKABLE, node.locations.self);
    }

    notGenericFunction(node: ASTNode) {
        return this.pushError(mess.NOT_GENERIC_FUNCTION, node.locations.self);
    }

    invalidTypeArgCount(expected: number, actual: number, node: ASTNode) {
        return this.pushError(mess.INVALID_TYPE_ARG_COUNT(expected, actual), node.locations.self);
    }

    invalidTypeArg(arg: TType, param: TParam, node: ASTNode) {
        return this.pushError(mess.INVALID_TYPE_ARG(arg, param.name, param.constraint), node.locations.self);
    }

    invalidArgCount(expected: number, actual: number, node: ASTNode) {
        return this.pushError(mess.INVALID_ARG_COUNT(expected, actual), node.locations.self);
    }

    invalidBreak(node: ASTNode) {
        return this.pushError(mess.INVALID_BREAK_STATEMENT, node.locations.self);
    }

    invalidContinue(node: ASTNode) {
        return this.pushError(mess.INVALID_CONTINUE_STATEMENT, node.locations.self);
    }

    invalidLoopNum(stmt: ast.BreakStatement | ast.ContinueStatement) {
        return this.pushError(mess.INVALID_LOOP_NUM(stmt.loopNumber, this.context.loopNumber), stmt.locations.self);
    }

    invalidBinaryOp(exp: ast.BinaryExpression, left: TType, right: TType) {
        return this.pushError(mess.INVALID_BINARY_OPERATOR(exp.symbol, left, right), exp.locations.self);
    }

    invalidUnaryOp(exp: ast.UnaryExpression, target: TType) {
        return this.pushError(mess.INVALID_UNARY_OPERATOR(exp.symbol, target), exp.locations.self);
    }

    /****************
     * DECLARATIONS *
     ****************/

    visitProgram(_program: ast.Program): TType { throw new Error("Method not implemented."); }
    visitImportDeclaration(_decl: ast.ImportDeclaration): TType { throw new Error("Method not implemented."); }
    visitExportDeclaration(_decl: ast.ExportDeclaration): TType { throw new Error("Method not implemented."); }
    visitExportForwardDeclaration(_decl: ast.ExportForwardDeclaration): TType { throw new Error("Method not implemented."); }

    @baseCheck
    visitTypeDeclaration(decl: ast.TypeDeclaration): TType {
        this.context = new TypeCheckContext();
        // if there are type parameters, this is a generic type
        if (decl.typeParams) {
            const typeParams = new OrderedMap<TParam>();
            for (const p of decl.typeParams) {
                this.context.typeParams[p.name] = p.visit(this) as TParam;
                typeParams.add(p.name, this.context.typeParams[p.name]);
            }
            return new TGeneric(typeParams, decl.typeNode.visit(this));
        }
        // otherwise, it just resolves to the type of the type definition
        return decl.typeNode.visit(this);
    }

    @baseCheck
    visitTypeParam(param: ast.TypeParam): TType {
        // no defined variance means it needs to be inferred from how it is used
        const variance = param.varianceOp === '+' ? 'covariant' : param.varianceOp === '-' ? 'contravariant' : 'invariant';
        // no defined constraint means it defaults to any
        const constraint = param.typeConstraint ? param.typeConstraint.visit(this) : new TAny();
        return new TParam(param.name, variance, constraint);
    }

    @baseCheck
    visitFunctionDeclaration(decl: ast.FunctionDeclaration): TType {
        let type: TType;
        this.context = new TypeCheckContext();
        // resolve type parameter types (this must be done first because param and return types may use them)
        let typeParams: OrderedMap<TParam> | undefined;
        if (decl.typeParams) {
            typeParams = new OrderedMap();
            for (const p of decl.typeParams) {
                this.context.typeParams[p.name] = p.visit(this) as TParam;
                typeParams.add(p.name, this.context.typeParams[p.name]);
            }
        }
        // resolve types of parameters and return type
        const paramTypes = decl.params.map(p => p.visit(this));
        const returnType = decl.returnType.visit(this);
        // the type of the function will be unknown if any component types are unknown, otherwise it has a function type
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) type = new TUnknown();
        else type = new TFunction(paramTypes, returnType, typeParams);
        // create a symbol table initialized to contain the parameters
        for (let i = 0; i < decl.params.length; ++i) {
            this.context.symbolTable[decl.params[i].name] = paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table and the return type of the function as the expected type of the body
        const actualReturnType = decl.body.visit(this) as TType;
        if (!(returnType instanceof TUnknown) && !returnType.isAssignableFrom(actualReturnType)) {
            this.typeMismatch(actualReturnType, returnType.toString(), decl.returnType);
        }
        return type;
    }

    @baseCheck
    visitParam(param: ast.Param): TType {
        return param.typeNode.visit(this);
    }

    @baseCheck
    visitLambdaParam(_param: ast.LambdaParam): TType {
        // if the type isn't explicit, we can't infer it, that will happen during type checking
        return new TInferred();
    }

    @baseCheck
    visitConstantDeclaration(decl: ast.ConstantDeclaration): TType {
        // new context
        this.context = new TypeCheckContext();
        // visit the value of the constant
        return (decl.value as ast.Expression).visit(this);
    }
    
    /*********
     * TYPES *
     *********/

    @baseCheck
    visitBuiltInType(type: ast.BuiltInType): TType {
        switch (type.typeNode) {
            case 'u8': case 'byte': return new TInteger(8, false);
            case 'i8': return new TInteger(8, true);
            case 'u16': case 'short': return new TInteger(16, false);
            case 'i16': return new TInteger(16, true);
            case 'u32': return new TInteger(32, false);
            case 'i32': case 'integer': return new TInteger(32, true);
            case 'u64': return new TInteger(64, false);
            case 'i64': case 'long': return new TInteger(64, true);
            case 'int': return new TInteger(Infinity, true);
            case 'f32': case 'float': return new TFloat(32);
            case 'f64': case 'double': return new TFloat(64);
            case 'char': return new TChar();
            case 'string': return new TArray(new TChar());
            case 'bool': return new TBool();
            case 'void': return new TTuple([]);
            case 'any': return new TAny();
            default: throw new Error(`Invalid built-in type ${type.typeNode}`);
        }
    }

    @baseCheck
    visitIdentifierType(type: ast.IdentifierType): TType {
        // check for a type param first
        if (this.context.typeParams[type.name]) {
            return this.context.typeParams[type.name];
        } else {
            const moduleType = this.getModuleType(type.name);
            if (!moduleType) return this.typeNotDefined(type.name, type);
            return moduleType;
        }
    }

    @baseCheck
    visitArrayType(type: ast.ArrayType): TType {
        const baseType = type.baseType.visit(this);
        if (baseType instanceof TUnknown) return new TUnknown();
        else return new TArray(baseType);
    }

    /**
     * TODO: does it make sense for explicit function types to have type params?
     * If so, the syntax will have to be extended to allow for that...
     */
    @baseCheck
    visitFunctionType(type: ast.FunctionType): TType {
        const paramTypes = type.paramTypes.map(t => t.visit(this));
        const returnType = type.returnType.visit(this);
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) return new TUnknown();
        else return new TFunction(paramTypes, returnType);
    }

    @baseCheck
    visitParenthesizedType(type: ast.ParenthesizedType): TType {
        return type.inner.visit(this);
    }

    /**
     * A specific type resolves to a particular "instantiation" of its corresponding generic type.
     * What is returned is a clone of the generic type's underlying type, but with the
     * type parameters replaced with the corresponding type arguments.
     * Those type arguments keep the variance constraints from the parameters
     * so that we know what types are assignable to the specific type.
     */
    @baseCheck
    visitSpecificType(type: ast.SpecificType): TType {
        // first, resolve the TGeneric
        const genericType = type.typeNode.visit(this);
        if (!genericType.isGeneric()) return this.notGeneric(type);
        // second, resolve all type arguments
        const typeArgs = type.typeArgs.map(a => a.visit(this));
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

    @baseCheck
    visitStructType(type: ast.StructType): TType {
        const fields: { [name: string]: TType } = {};
        for (const field of type.fields) {
            if (fields[field.name]) return this.nameClash(field.name, type.locations[`field_${field.name}`]);
            fields[field.name] = field.type.visit(this);
            if (fields[field.name] instanceof TUnknown) return new TUnknown();
        }
        return new TStruct(fields);
    }

    @baseCheck
    visitTupleType(type: ast.TupleType): TType {
        const types = type.types.map(t => t.visit(this));
        if (types.some(t => t instanceof TUnknown)) return new TUnknown();
        else return new TTuple(types);
    }

    @baseCheck
    visitUnionType(type: ast.UnionType): TType {
        const types = type.types.map(t => t.visit(this));
        if (types.some(t => t instanceof TUnknown)) return new TUnknown();
        else return new TUnion(types);
    }

    @baseCheck
    visitNamespaceAccessType(type: ast.NamespaceAccessType): TType {
        const baseType = type.baseType.visit(this);
        /**
         * The lowest-level node that can resolve to a namespace is an identifier type,
         * but those don't have to be namespaces, so the actual error-throwing happens here.
         */
        if (!baseType.isNamespace() && type.baseType instanceof ast.IdentifierType)
            return this.notNamespace(type.baseType.name, type.baseType);
        // resolve the module of the namespace
        const module = this.typeChecker.modules[baseType.getModuleId()];
        // resolve the corresponding type
        const resolvedType = this.typeChecker.getType(module, type.typeName);
        if (!resolvedType) return this.typeNotDefined(type.typeName, type);
        return resolvedType;
    }
    
    /**************
     * STATEMENTS *
     **************/

    @baseCheck
    visitBlock(block: ast.Block): TType {
        let returnType: TType = new TNever();
        for (const statement of block.statements) {
            if (statement instanceof ast.Expression) {
                // types of expression statements are not used in blocks
                statement.visit(this);
            } else {
                // statements may have return types (if they are return statements or contain return statements)
                const type = statement.visit(this);
                returnType = determineGeneralType(returnType, type);
            }
        }
        return returnType;
    }

    @baseCheck
    visitExpressionStatement(exp: ast.ExpressionStatement): TType {
        exp.expression.visit(this);
        return new TNever();
    }

    @baseCheck
    visitBreakStatement(stmt: ast.BreakStatement): TType {
        if (this.context.loopNumber < 0) {
            this.invalidBreak(stmt);
        } else if (stmt.loopNumber < 0 || stmt.loopNumber > this.context.loopNumber) {
            this.invalidLoopNum(stmt);
        }
        return new TNever();
    }

    @baseCheck
    visitContinueStatement(stmt: ast.ContinueStatement): TType {
        if (this.context.loopNumber < 0) {
            this.invalidContinue(stmt);
        } else if (stmt.loopNumber < 0 || stmt.loopNumber > this.context.loopNumber) {
            this.invalidLoopNum(stmt);
        }
        return new TNever();
    }

    @baseCheck
    visitDoWhileStatement(stmt: ast.DoWhileStatement): TType {
        // increment the loop number
        this.context.loopNumber++;
        // type check the body
        const returnType = stmt.body.visit(this);
        this.context.loopNumber--;
        // type check the condition
        const conditionType = stmt.conditionExp.visit(this);
        if (!conditionType.isBool()) {
            this.typeMismatch(conditionType, 'bool', stmt.conditionExp);
        }
        return returnType;
    }

    @baseCheck
    visitForStatement(stmt: ast.ForStatement): TType {
        // type check the iterable expression, will fill in the base type of the array
        const arrayType = stmt.iterableExp.visit(this);
        let iterType;
        if (!arrayType.isArray()) {
            iterType = this.typeMismatch(arrayType, '?[]', stmt.iterableExp);
        } else {
            iterType = arrayType.getBaseType();
        }
        // add the iterator variable to the symbol table, visit the body, then remove it
        this.context.symbolTable[stmt.iterVar] = iterType;
        // increment the loop number
        this.context.loopNumber++;
        const returnType = stmt.body.visit(this);
        delete this.context.symbolTable[stmt.iterVar];
        this.context.loopNumber--;
        return returnType;
    }

    @baseCheck
    visitReturnStatement(stmt: ast.ReturnStatement): TType {
        // no return value, assumed to be ()
        if (!stmt.exp) return new TTuple([]);
        // otherwise check the return value
        return stmt.exp.visit(this);
    }

    @baseCheck
    visitThrowStatement(stmt: ast.ThrowStatement): TType {
        // type check the expression, it can be anything so we don't have to do anything with the result
        stmt.exp.visit(this);
        return new TNever();
    }

    @baseCheck
    visitTryCatchStatement(stmt: ast.TryCatchStatement): TType {
        // type check the try
        let returnType = stmt.try.visit(this);
        // type check each try
        for (const cat of stmt.catches) {
            // add the param to the symbol table, type check the catch, remove it
            this.context.symbolTable[cat.param.name] = cat.param.typeNode.visit(this);
            const returnType1 = cat.body.visit(this);
            returnType = determineGeneralType(returnType, returnType1);
            delete this.context.symbolTable[cat.param.name];
        }
        if (!stmt.finally) return returnType;
        // type check the finally
        const returnType1 = stmt.finally.visit(this);
        return determineGeneralType(returnType, returnType1);
    }

    @baseCheck
    visitWhileStatement(stmt: ast.WhileStatement): TType {
        // type check the condition
        const conditionType = stmt.conditionExp.visit(this);
        if (!conditionType.isBool()) {
            this.typeMismatch(conditionType, 'bool', stmt.conditionExp);
        }
        // increment the loop number
        this.context.loopNumber++;
        // type check the body
        const returnType = stmt.body.visit(this);
        this.context.loopNumber--;
        return returnType;
    }
    
    /***************
     * EXPRESSIONS *
     ***************/

    @baseCheck
    visitBoolLiteral(_lit: ast.BoolLiteral): TType {
        return new TBool();
    }

    @baseCheck
    visitCharLiteral(_lit: ast.CharLiteral): TType {
        return new TChar();
    }

    @baseCheck
    visitFloatLiteral(_lit: ast.FloatLiteral): TType {
        return new TFloat(64);
    }

    @baseCheck
    visitIntegerLiteral(lit: ast.IntegerLiteral): TType {
        let signed, size;
        if (lit.value < 0) {
            signed = true;
            if ((-lit.value) < (2 ** 7)) size = 8;
            else if ((-lit.value) < (2 ** 15)) size = 16;
            else if ((-lit.value) < (2 ** 31)) size = 32;
            else if (lit.value > -(2 ** 63)) size = 64;
            else size = Infinity;
        } else {
            signed = false;
            if (lit.value < (2 ** 8)) size = 8;
            else if (lit.value < (2 ** 16)) size = 16;
            else if (lit.value < (2 ** 32)) size = 32;
            else if (lit.value < (2 ** 64)) size = 64;
            else size = Infinity;
        }
        return new TInteger(size, signed);
    }

    @baseCheck
    visitStringLiteral(_lit: ast.StringLiteral): TType {
        return new TArray(new TChar());
    }

    @baseCheck
    visitIdentifierExpression(exp: ast.IdentifierExpression): TType {
        let actualType: TType = this.context.symbolTable[exp.name];
        if (!actualType) actualType = this.getModuleValueType(exp.name) as TType;
        if (!actualType) return this.valueNotDefined(exp.name, exp.locations.self);
        return actualType;
    }

    @baseCheck
    visitArrayAccess(acc: ast.ArrayAccess): TType {
        const arrayType = acc.target.visit(this);
        if (!arrayType.isArray()) return this.notArray(acc.target);
        // verify that the index expression is an integer
        const indexExpType = acc.indexExp.visit(this);
        if (!indexExpType.isInteger()) this.typeMismatch(indexExpType, 'unsigned int', acc.indexExp);
        // type is the base type of the array
        return arrayType.getBaseType();
    }

    @baseCheck
    visitArrayLiteral(lit: ast.ArrayLiteral): TType {
        // for all items, make sure there is one base assignable type for them all
        const baseType = lit.items.map(i => i.visit(this)).reduce(determineGeneralType, new TNever())
        return new TArray(baseType);
    }

    @baseCheck
    visitBinaryExpression(exp: ast.BinaryExpression): TType {
        // resolve the left and right expression types
        const leftType = exp.left.visit(this);
        const rightType = exp.right.visit(this);
        // create the operator of the specific type
        const oper = createBinary(exp.symbol, 'infix', leftType, rightType);
        // no infix operator of that kind
        if (!oper) return this.valueNotDefined(exp.symbol, exp.locations.oper);
        exp.operator = oper;
        // invalid left/right types
        if (exp.operator.functionType instanceof TUnknown) return this.invalidBinaryOp(exp, leftType, rightType);
        // the return type of the operator type is the type of this expression
        return exp.operator.functionType.getReturnType();
    }

    @baseCheck
    visitFieldAccess(acc: ast.FieldAccess): TType {
        const type = acc.target.visit(this);
        // the type can be either a struct or a namespace
        if (type.isStruct()) {
            if (!type.hasField(acc.field)) return this.valueNotDefined(acc.field, acc.locations.field);
            return type.getField(acc.field);
        } else if (type.isNamespace()) {
            // resolve the module of the namespace
            const module = this.typeChecker.modules[type.getModuleId()];
            // resolve the corresponding type
            const resolvedType = this.typeChecker.getValueType(module, acc.field);
            if (!resolvedType) return this.valueNotDefined(acc.field, acc.locations.field);
            return resolvedType;
        } else {
            return this.notStruct(acc.target);
        }
    }

    /**
     * This is one of the most complex type resolution methods in the whole language.
     * There is a different process for each of the following three cases:
     * 1. Calling a non-generic function
     * 2. Calling a generic function, explicitly specifying type arguments
     * 3. Calling a generic function without type arguments (requiring inference)
     */
    @baseCheck
    visitFunctionApplication(app: ast.FunctionApplication): TType {
        // get the type of the function
        const funcType = app.target.visit(this);
        if (funcType instanceof TUnknown) return funcType;
        if (!funcType.isFunction()) return this.notInvokable(app.target);
        let params = funcType.getParams();
        // verify parameter count
        if (!this.verifyCount(app.args, params)) return this.invalidArgCount(params.length, app.args.length, app.target);

        // handle generic logic to resolve the type arguments and the specific parameter types
        let typeArgs: TType[] = [];
        if (funcType.isGeneric()) {
            let valid: bool;
            // if there are no type arguments, they need to be inferred
            if (!app.typeArgs) {
                // verify that the args are structurally assignable to the generic parameters, if not we can't proceed
                valid = this.verifyAssignments(app.args.map(a => a.visit(this)), params, app.args);
                typeArgs = (funcType as TFunction).inferTypeArgumentTypes(app.args.map(a => a.visit(this)));
            } else {
                const typeParams = funcType.getTypeParams();
                // verify type parameter count
                if (!this.verifyCount(app.typeArgs, typeParams)) return this.invalidTypeArgCount(typeParams.length, app.typeArgs.length, app);
                // verify type arg assignments, if not valid we can't proceed
                typeArgs = app.typeArgs.map(a => a.visit(this));
                valid = this.verifyAssignments(typeArgs, funcType.getTypeParams().values(), app.typeArgs);
            }
            if (!valid) return new TUnknown();
            // resolve the specific types of the params
            params = (funcType as TFunction).getSpecificParamTypes(typeArgs);
        } else {
            // verify that we didn't specify type arguments
            if (app.typeArgs) return this.notGenericFunction(app);
        }

        // verify arg assignments
        this.verifyAssignments(app.args.map(a => a.visit(this)), params, app.args);
        this.completeLambdaResolutions(app.args, params);

        // get the return type of the function type
        return funcType.isGeneric() ? (funcType as TFunction).getSpecificReturnType(typeArgs) : funcType.getReturnType();
    }

    private verifyCount(list1: ArrayLike<any>, list2: ArrayLike<any>) {
        return list1.length === list2.length;
    }

    private verifyAssignments(fromTypes: TType[], toTypes: TType[], nodes: ASTNode[]) {
        let error = false;
        for (let i = 0; i < fromTypes.length; ++i) {
            if (fromTypes[i] instanceof TUnknown) continue; // skip errors
            if (!toTypes[i].isAssignableFrom(fromTypes[i])) {
                this.typeMismatch(fromTypes[i], toTypes[i].toString(), nodes[i]);
                error = true;
            }
        }
        return !error;
    }

    private completeLambdaResolutions(args: ast.Expression[], paramTypes: TType[]) {
        for (let i = 0; i < args.length; ++i) {
            // function application is the only place that lambdas can be passed (for now),
            // so we need to complete the resolution of the type and the lambda body
            if (args[i] instanceof ast.BaseLambdaExpression && (args[i].type instanceof TFunction)) {
                (args[i].type as TFunction).completeResolution(paramTypes[i]);
                this.completeLambdaResolution(args[i] as ast.BaseLambdaExpression);
            }
        }
    }

    @baseCheck
    visitIfElseExpression(exp: ast.IfElseExpression): TType {
        const conditionType = exp.condition.visit(this);
        if (!conditionType.isBool()) this.typeMismatch(conditionType, 'bool', exp.condition);
        const type = exp.consequent.visit(this);
        const altType = exp.alternate.visit(this);
        return determineGeneralType(type, altType);
    }

    @baseCheck
    visitLambdaExpression(exp: ast.LambdaExpression): TType {
        const paramTypes = exp.params.map(p => p.visit(this));
        // can't infer return type, that will happen when we are checking types
        return new TFunction(paramTypes, new TInferred());
    }

    /**
     * Once the type of the lambda has been inferred and filled in,
     * we need to do resolution on the body.
     */
    private completeLambdaResolution(exp: ast.BaseLambdaExpression) {
        // create a new context for this function
        this.context = new TypeCheckContext();
        for (let i = 0; i < exp.params.length; ++i) {
            this.context.symbolTable[exp.params[i].name] = exp.type.paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table
        const actualReturnType = exp.body.visit(this);
        if (!exp.type.returnType.isAssignableFrom(actualReturnType))
            this.typeMismatch(actualReturnType, exp.type.returnType.toString(), exp);
    }

    @baseCheck
    visitParenthesizedExpression(exp: ast.ParenthesizedExpression): TType {
        return exp.inner.visit(this);
    }

    @baseCheck
    visitStructLiteral(lit: ast.StructLiteral): TType {
        const fields: SymbolTable<TType> = {};
        for (const { key, value } of lit.entries) {
            fields[key] = value.visit(this);
        }
        return new TStruct(fields);
    }

    @baseCheck
    visitTupleLiteral(lit: ast.TupleLiteral): TType {
        const itemTypes = [];
        for (const item of lit.items) {
            itemTypes.push(item.visit(this));
        }
        return new TTuple(itemTypes);
    }

    @baseCheck
    visitUnaryExpression(exp: ast.UnaryExpression): TType {
        const targetType = exp.target.visit(this);
        // check if the operator exists
        const oper = createUnary(exp.symbol, exp.prefix ? 'prefix' : 'postfix', targetType);
        // no unary operator of that kind
        if (!oper) return this.valueNotDefined(exp.symbol, exp.locations.oper);
        exp.operator = oper;
        // invalid target type
        if (exp.operator.functionType instanceof TUnknown) return this.invalidUnaryOp(exp, targetType);
        // the return type of the operator type is the type of this expression
        return exp.operator.functionType.getReturnType();
    }

    @baseCheck
    visitVarDeclaration(decl: ast.VarDeclaration): TType {
        const expType = decl.initExp.visit(this);
        if (this.context.symbolTable[decl.name] || this.getModuleValueType(decl.name)) {
            // symbol already exists
            this.nameClash(decl.name, decl.locations.name);
        } else {
            // add the variable to the symbol table
            this.context.symbolTable[decl.name] = expType;
        }
        return expType;
    }
}

function baseCheck(_target: TypeCheckVisitor, _name: string, desc: TypedPropertyDescriptor<(node: ASTNode) => TType>) {
    const orig = desc.value as (node: ASTNode) => TType;
    desc.value = function(node: ASTNode) {
        if (node.type) return node.type;
        return node.type = orig.call(this, node);
    };
}
