import { CSTNode, ASTNode } from '../Node';
import { Token, ILocation } from '../../parser/Tokenizer';
import { FunctionDeclaration, STFunctionDeclaration } from './FunctionDeclaration';
import { TypeDeclaration, STTypeDeclaration } from './TypeDeclaration';
import { Expression, STExpression } from '../expressions';
import INodeVisitor from '../INodeVisitor';


export class ExportDeclaration extends ASTNode {
    name: string;
    value: FunctionDeclaration | TypeDeclaration | Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitExportDeclaration(this);
    }

    prettyName() {
        return `export ${this.name}`;
    }
}

export class STExportDeclaration extends CSTNode<ExportDeclaration> {
    exportToken: Token;
    exportName: STExportName;
    exportValue: STExportValue;

    reduce() {
        const node = new ExportDeclaration();
        const { name, loc } = this.exportName.reduce();
        node.name = name;
        node.registerLocation('name', loc);
        node.value = this.exportValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.value.locations.self);
        return node;
    }
}

export class STExportName extends CSTNode<{ name: string, loc: ILocation }> {
    defaultToken: Token;
    namedExport: STNamedExport;

    reduce() {
        if (this.defaultToken) {
            return { name: 'default', loc: this.defaultToken.getLocation() };
        } else {
            return this.namedExport.reduce();
        }
    }
}

export class STNamedExport extends CSTNode<{ name: string, loc: ILocation }> {
    exportNameToken: Token;
    equalsToken: Token;

    reduce() {
        return {
            name: this.exportNameToken.image,
            loc: this.exportNameToken.getLocation(),
        };
    }
}

export class STExportValue extends CSTNode<FunctionDeclaration | TypeDeclaration | Expression> {
    function: STFunctionDeclaration;
    typeNode: STTypeDeclaration;
    expression: STExpression;

    reduce() {
        if (this.function) return this.function.reduce();
        if (this.typeNode) return this.typeNode.reduce();
        if (this.expression) return this.expression.reduce();
        else throw new Error('this should never happen');
    }
}