//! This module contains the next generation parsing and syntax logic for Ren.
//! This is based heavily on rust-analyzer's logic and structure.
//! While rust-analyzer uses third party crates (rustc_lexer, rowan) which adds
//! significant complexity to the types, we'll be adapting our own versions of these crates.
//! 
//! Eventually this will replace the existing logic.

mod lexer;
mod syntax;
mod parser;

pub use syntax::SourceFile;
