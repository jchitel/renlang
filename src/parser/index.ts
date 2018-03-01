import { ModuleRoot } from '~/syntax';
import { createTokenStream } from './lexer';
import { Parser } from './parser';
import { SyntaxEnvironment } from '~/syntax/environment';


export function parseModule(path: string): ModuleRoot {
    const parser = Parser(createTokenStream(path));
    const env = SyntaxEnvironment();
    return parser.parse(env.ModuleRoot);
}