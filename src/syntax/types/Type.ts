import ASTNode from '~/syntax/ASTNode';
import { nonTerminal } from '~/parser/Parser';


@nonTerminal({ abstract: true })
export abstract class Type extends ASTNode {}
