import ASTNode from '../ASTNode';
import INodeVisitor from '../INodeVisitor';
import { Type } from '../types/ast';
import { Expression } from '../expressions/ast';
import { Statement } from '../statements/ast';


export class Program extends ASTNode {
    imports: ImportDeclaration[];
    functions: FunctionDeclaration[] = [];
    types: TypeDeclaration[] = [];
    exports: ExportDeclaration[] = [];

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitProgram(this);
    }
}

export class ImportDeclaration extends ASTNode {
    moduleName: string;
    importNames: { [name: string]: string };
    
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

export class ExportDeclaration extends ASTNode {
    name: string;
    value: FunctionDeclaration | TypeDeclaration | Expression;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitExportDeclaration(this);
    }

    prettyName() {
        return `export ${this.name}`;
    }
}
