#![feature(box_syntax)]
#![feature(option_expect_none)]
#![feature(try_trait)]

use std::env;
use std::io;
use std::process;

mod core;
mod parser;
mod runner;
mod semantic;
mod syntax;
mod utils;

fn main() -> io::Result<()> {
    // extract the program path and arguments
    let args: Vec<String> = env::args().collect();
    let path = &args[1];
    let args = &args[2..];

    // run the program
    let exitCode = runner::run_program(
        env::current_dir()?.join(path),
        args
    );

    // exit the process
    process::exit(exitCode)
}
