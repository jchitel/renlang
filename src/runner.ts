import { DiagnosticLevel } from '~/core';
import typecheck from '~/typecheck';
import { Program } from '~/typecheck/program';


/**
 * Runs the program at the given (absolute) path with the provided arguments.
 */
export function runProgram(path: string, args: string[]) {
    // perform type checking on the specified path, which will enumerate all modules in the Program
    const program = typecheck(path);
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
    // semantically good, translate the program
    const executable = translate(program);
    // compiled successfully, run the program
    return interpret(executable, args);
}

// TODO
const translate = (_program: Program) => ({});
const interpret = (_executable: {}, _args: string[]) => 0;
