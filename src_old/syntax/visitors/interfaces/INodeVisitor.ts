import IDeclarationVisitor from './IDeclarationVisitor';
import ITypeVisitor from './ITypeVisitor';
import IExpressionVisitor from './IExpressionVisitor';
import IStatementVisitor from './IStatementVisitor';


/**
 * A visitor type for all node types
 */
export default interface INodeVisitor<T>
    extends IDeclarationVisitor<T>, ITypeVisitor<T>, IExpressionVisitor<T>, IStatementVisitor<T> {}
