import { mapSet } from '~/utils/utils';
import { parseModule } from '~/parser';
import { Diagnostic, DiagnosticLevel } from '~/core';


/**
 * Runs the program at the given (absolute) path with the provided arguments.
 */
export function runProgram(path: string, args: string[]) {
    let program: Program = {
        modules: new Map<string, Module>(),
        diagnostics: [],
        addModule,
    };
    // add the main module (this will be a recursive operation for any imported modules)
    program = program.addModule(path);
    // we will eventually provide a verbosity option, but for now just set it to Message
    const diags = program.diagnostics.filter(d => d.level >= DiagnosticLevel.Message);
    const errCount = diags.count(d => d.level >= DiagnosticLevel.Error);
    const warnCount = diags.count(d => d.level === DiagnosticLevel.Warning);
    if (errCount > 0) {
        // there were errors, print all messages and exit
        process.stderr.write(`Errors: ${errCount}, Warnings: ${warnCount}\n\n`);
        process.stderr.write(diags.map(d => `${d}\n`).join());
        process.stderr.write('\nCompilation failed\n');
        return 1;
    } else if (diags.length) {
        // otherwise, just print all messages and continue
        process.stderr.write(`Warnings: ${warnCount}\n\n`)
        process.stderr.write(diags.map(d => `${d}\n`).join());
        const suffix = warnCount > 0 ? ' with warnings' : '';
        process.stderr.write(`\nCompilation succeeded${suffix}\n\n`);
    }
    // compiled successfully, run the main module
    return runModule(program, path, args);
}

export function addModule(this: Program, path: string): Program {
    const { module, diagnostics } = parseModule(path);
    return {
        ...this,
        modules: mapSet(this.modules, path, module),
        diagnostics: [...this.diagnostics, ...diagnostics],
    }
}

export function runModule(program: Program, path: string, args: string[]): number {
    const module = program.modules.get(path);
}

export interface Program {
    readonly modules: ReadonlyMap<string, Module>;
    readonly diagnostics: ReadonlyArray<Diagnostic>;
    readonly addModule: typeof addModule;
}

export interface Module {}
