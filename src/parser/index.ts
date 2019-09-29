import { ModuleRoot } from '~/syntax';
import { createTokenStream } from './lexer';
import { createParser } from './parser';
import { SyntaxEnvironment } from '~/syntax/environment';
import { Diagnostic } from '~/core';


export function parseModule(path: string): { module: Optional<ModuleRoot>, diagnostics: ReadonlyArray<Diagnostic> } {
    const { tokens, diagnostics: _diags } = createTokenStream(path);
    if (_diags.length) return { module: null, diagnostics: _diags };
    const parser = createParser(tokens);
    const env = SyntaxEnvironment();
    const { result: module, diagnostics } = parser.parse(env.parseModuleRoot);
    return { module, diagnostics };
}