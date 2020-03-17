use std::collections::HashMap;
use super::namespace::{Declaration, Namespace};


/// A complete semantic program. This is the top-level data structure
/// for the semantic process of the compiler.
pub struct Program {
    modules: HashMap<String, u32>,
    namespaces: Vec<Namespace>,
    declarations: Vec<Declaration>,
}

impl Program {
    pub fn new(
        modules: HashMap<String, u32>,
        namespaces: Vec<Namespace>,
        declarations: Vec<Declaration>,
    ) -> Program {
        Program {
            modules,
            namespaces,
            declarations,
        }
    }
}
