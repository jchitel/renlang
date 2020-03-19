use std::path::PathBuf;

use crate::core::{Diagnostic, DiagnosticLevel, DiagResult};
use crate::semantic::{analyze, program::Program};

pub fn run_program(path: PathBuf, args: &[String]) -> i32 {
    // perform type checking on the specified path, which will enumerate all modules in the Program
    let DiagResult(program, diags) = analyze(path);
    // we will eventually provide a verbosity option, but for now just set it to Message
    let diags: Vec<&Diagnostic> = diags.iter()
        .filter(|d| { d.level >= DiagnosticLevel::Message })
        .collect();
    let errCount = diags.iter().filter(|d| { d.level >= DiagnosticLevel::Error }).count();
    let warnCount = diags.iter().filter(|d| { d.level == DiagnosticLevel::Warning }).count();
    if errCount > 0 {
        // there were errors, print all messages and exit
        eprintln!("Errors: {}, Warnings: {}\n\n", errCount, warnCount);
        eprintln!("{}", diags.iter().map(|d| { format!("{}\n", d) }).collect::<Vec<String>>().join(""));
        eprintln!("\nCompilation failed\n");
        return 1;
    } else if diags.len() > 0 {
        // otherwise, just print all messages and continue
        eprintln!("Warnings: {}\n\n", warnCount);
        eprintln!("{}", diags.iter().map(|d| { format!("{}\n", d) }).collect::<Vec<String>>().join(""));
        let suffix = if warnCount > 0 { " with warnings" } else { "" };
        eprintln!("\nCompilation succeeded{}\n\n", suffix);
    }
    // semantically good, translate the program
    let executable = translate(program.unwrap());
    // compiled successfully, run the program
    interpret(executable, args)
}

// TODO
struct Executable;
fn translate(_program: Program) -> Executable { unimplemented!() }
fn interpret(_executable: Executable, _args: &[String]) -> i32 { unimplemented!() }
