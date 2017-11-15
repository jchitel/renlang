import { Location } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { Type } from '~/syntax/types/ast';
import { Expression } from '~/syntax/expressions/ast';
import { Statement } from '~/syntax/statements/ast';


export class Program extends ASTNode {
    imports: ImportDeclaration[];
    functions: FunctionDeclaration[] = [];
    types: TypeDeclaration[] = [];
    constants: ConstantDeclaration[] = [];
    exports: ExportDeclaration[] = [];
    forwards: ExportForwardDeclaration[] = [];

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitProgram(this);
    }
}

export class ImportDeclaration extends ASTNode {
    moduleName: string;
    imports: {
        importName: string,
        importLocation: Location,
        aliasName: string,
        aliasLocation: Location,
    }[];
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitImportDeclaration(this);
    }
}

export class TypeDeclaration extends ASTNode {
    name: string;
    typeParams: TypeParam[];
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitTypeDeclaration(this);
    }
}

export class TypeParam extends ASTNode {
    name: string;
    varianceOp: string;
    typeConstraint: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitTypeParam(this);
    }
}

export class FunctionDeclaration extends ASTNode {
    returnType: Type;
    name: string;
    typeParams: TypeParam[];
    params: Param[];
    body: Expression | Statement;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitFunctionDeclaration(this);
    }

    prettyName() {
        return `${this.name}(${this.params.map(p => p.prettyName()).join(', ')})`;
    }
}

export class Param extends ASTNode {
    name: string;
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitParam(this);
    }

    prettyName() {
        return `${this.type} ${this.name}`;
    }
}

export class ConstantDeclaration extends ASTNode {
    name: string;
    value: Expression;

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitConstantDeclaration(this);
    }
}

export class ExportDeclaration extends ASTNode {
    /**
     * Cases:
     * - Default export of a name (export name = default, value name = value name, NO value)
     * - Named export of a name (export name AND value name = value name, NO value)
     * - Named export with an alias (export name = alias, value name = value name, NO value)
     * - Default export of a named value (export name = default, value name = name from value, value = value)
     * - Default export of an anonymous value (export name = default, NO value name, value = value)
     * - Named export of a named value (export name AND value name = name from value, value = value)
     */
    exports: {
        // export name is always present
        exportName: string,
        exportNameLocation: Location,
        // value name is not present only for default anonymous exports
        valueName?: string,
        valueNameLocation?: Location,
        // value is not present for exports of existing names
        value?: FunctionDeclaration | TypeDeclaration | ConstantDeclaration | Expression,
    }[];
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitExportDeclaration(this);
    }

    prettyName(name: string) {
        return `export ${name}`;
    }
}

export class ExportForwardDeclaration extends ASTNode {
    moduleName: string;
    forwards: {
        importName: string,
        importLocation: Location,
        exportName: string,
        exportLocation: Location,
    }[];

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitExportForwardDeclaration(this);
    }
}
