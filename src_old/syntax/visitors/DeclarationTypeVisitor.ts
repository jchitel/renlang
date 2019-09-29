import * as ast from '~/syntax';
import IDeclarationVisitor from './interfaces/IDeclarationVisitor';
import TypeChecker from '~/typecheck/TypeChecker';
import * as types from '~/typecheck/types';
import { Variance } from '~/typecheck/types/TParam';
import TypeResolutionVisitor from './TypeResolutionVisitor';
import preVisit from '~/utils/preVisit';
import OrderedMap from '~/utils/OrderedMap';
import { createNamespace } from '~/typecheck/types';


/**
 * This visitor is the top-level of pass 2 of the type checker.
 * It is responsible for resolving the types of all declarations
 * of a module.
 * By this point it is expected that pass 1 (DeclarationNameVisitor)
 * has already been run, so that all declarations are available by name.
 */
@preVisit<ast.Declaration, types.Type, DeclarationTypeVisitor>()
export default class DeclarationTypeVisitor implements IDeclarationVisitor<types.Type> {
    private visitor: TypeResolutionVisitor;

    constructor(private typeChecker: TypeChecker) {}

    /**
     * Some declarations (types and constants) need to have recursion detection
     * to prevent an infinite loop. This will call a function with recursion
     * detection enabled during the call.
     */
    private callWithRecursionDetection(decl: ast.Declaration, cb: () => types.Type): types.Type {
        // already resolving, avoid infinite recursion
        if (this.typeChecker.resolving.has(decl)) return types.createRecursive(decl);
        // add to set so circular references are handled
        this.typeChecker.resolving.add(decl);
        const val = cb();
        this.typeChecker.resolving.delete(decl);
        return val;
    }

    /**
     * Pre-visitor that provides memoization
     */
    preVisit(visitor: () => types.Type, visitee: ast.Declaration): types.Type {
        if (visitee.type) return visitee.type;
        return visitee.type = visitor();
    }

    /**
     * The type of a namespace is simply a namespace.
     * The namespace has a reference to the module it was imported from,
     * so we just need to grab all of the declaration ids of that module
     * and create a new namespace type.
     */
    visitNamespaceDeclaration(decl: ast.NamespaceDeclaration): types.Type {
        const names = this.typeChecker.names[decl.modulePath];
        const namespace: { [name: string]: number[] } = {};
        for (const name of Object.keys(names)) {
            namespace[name] = names[name].map(({ id }) => id);
        }
        return createNamespace(namespace);
    }

    /**
     * Type declarations need to have their type node (the definition)
     * resolved. If the declaration has type parameters, then it is a
     * generic type. Generic types need to initialize the type params
     * scope of the visitor before visiting the node.
     */
    visitTypeDeclaration(decl: ast.TypeDeclaration): types.Type {
        return this.callWithRecursionDetection(decl, () => {
            // initialize a new visitor for this declaration
            this.visitor = new TypeResolutionVisitor(this.typeChecker);
            if (decl.typeParams) {
                // if there are type parameters, this is a generic type
                const typeParams = new OrderedMap<types.ParamType>();
                for (const p of decl.typeParams) {
                    p.visit(this);
                    this.visitor.typeParams.set(p.name.image, p.type as types.ParamType);
                    typeParams.add(p.name.image, p.type as types.ParamType);
                }
                this.visitor.typeParams.push();
                const type = types.createGeneric(typeParams, decl.typeNode.visit(this.visitor));
                this.visitor.typeParams.pop();
                return type;
            } else {
                // otherwise, it just resolves to the type of the type definition
                return decl.typeNode.visit(this.visitor);
            }
        });
    }

    visitTypeParam(param: ast.TypeParam): types.ParamType {
        // no defined variance means it needs to be inferred from how it is used
        let variance: Variance = 'invariant';
        if (param.varianceOp) variance = param.varianceOp.image === '+' ? 'covariant' : 'contravariant';
        // no defined constraint means it defaults to any
        let constraint: types.Type = types.createAny();
        if (param.typeConstraint) {
            constraint = param.typeConstraint.visit(this.visitor);
        }
        return types.createParam(param.name.image, constraint, variance);
    }

    visitFunctionDeclaration(decl: ast.FunctionDeclaration): types.Type {
        // initialize a new visitor for this declaration
        this.visitor = new TypeResolutionVisitor(this.typeChecker);
        // resolve type parameter types (this must be done first because param and return types may use them)
        let typeParams: OrderedMap<types.ParamType> | undefined;
        if (decl.typeParams) {
            typeParams = new OrderedMap();
            for (const p of decl.typeParams) {
                p.visit(this);
                this.visitor.typeParams.set(p.name.image, p.type as types.ParamType);
                typeParams.add(p.name.image, p.type as types.ParamType);
            }
        }
        // resolve types of parameters and return type
        const paramTypes = decl.params.map(p => { p.visit(this); return p.type; });
        const returnType = decl.returnType.visit(this.visitor);
        // save the type to the instance right away so recursion will work
        decl.type = types.createFunction(paramTypes, returnType);
        // TODO: this is just wrong
        if (typeParams) decl.type = types.createGeneric(typeParams, decl.type);
        // add each parameter to the visitor's params scope
        for (let i = 0; i < decl.params.length; ++i) {
            this.visitor.params.set(decl.params[i].name.image, paramTypes[i]);
        }
        // type check the function body, the ternary is necessary because
        // Statement.visit() and Expression.visit() are not properly unioned
        const actualReturnType = decl.body instanceof ast.Expression
            ? decl.body.visit(this.visitor)
            : decl.body.visit(this.visitor);
        returnType.assertAssignableFrom(actualReturnType, decl.returnType);
        return decl.type;

        if (!(returnType instanceof TUnknown) && !returnType.isAssignableFrom(actualReturnType)) {
            this.pushError(p => TypeError.typeMismatch(p, actualReturnType, returnType, decl.returnType));
        }
    }

    visitParam(param: ast.Param): types.Type {
        throw new Error("Method not implemented.");
    }

    visitLambdaParam(param: ast.LambdaParam): types.Type {
        throw new Error("Method not implemented.");
    }

    visitConstantDeclaration(decl: ast.ConstantDeclaration): types.Type {
        throw new Error("Method not implemented.");
    }

    /** modules do not have a type */
    visitModule(_module: ast.Module): types.Type { throw new Error("Method not implemented."); }
    /** imports do not have a type */
    visitImportDeclaration(_decl: ast.ImportDeclaration): types.Type { throw new Error("Method not implemented."); }
    /** exports do not have a type */
    visitExportDeclaration(_decl: ast.ExportDeclaration): types.Type { throw new Error("Method not implemented."); }
    /** forwards do not have a type */
    visitExportForwardDeclaration(_decl: ast.ExportForwardDeclaration): types.Type { throw new Error("Method not implemented."); }
}
