#![feature(option_expect_none)]

use std::collections::{HashMap, HashSet};
use crate::core::FileRange;
use crate::parser::lexer::Token;

#[derive(Clone, Debug)]
pub struct PureForward {
    forwardNamespace: u32,
    exportModule: String,
    exportModuleLocation: FileRange,
    starLocation: FileRange
}

pub enum Dependency {
    ImportedName {
        importNamespace: u32,
        importName: Token,
        exportModule: String,
        exportModuleLocation: FileRange,
        exportName: Token
    },
    ImportedNamespace {
        importNamespace: u32,
        importName: Token,
        exportModule: String,
        exportModuleLocation: FileRange,
        starLocation: FileRange
    },
    ForwardedName {
        forwardNamespace: u32,
        forwardName: Token,
        exportModule: String,
        exportModuleLocation: FileRange,
        exportName: Token
    },
    /// Pure forwards are processed and replaced with ad hoc forwarded names,
    /// but because they aren't explicit they don't have the same structure as ForwardedNames.
    /// The forwarded name itself is pulled from the export module's exports,
    /// and any errors will be applied to the star location from the original pure forward.
    PureForwardReplacement {
        forwardNamespace: u32,
        forwardName: String,
        exportModule: String,
        exportModuleLocation: FileRange,
        starLocation: FileRange
    },
    ForwardedNamespace {
        forwardNamespace: u32,
        forwardName: Token,
        exportModule: String,
        exportModuleLocation: FileRange,
        starLocation: FileRange
    },
    ExportedName {
        namespace: u32,
        localName: Token,
        exportName: Token
    }
}

pub struct PureForwardGraph {
    map: HashMap<(usize, usize), PureForward>,
    size: usize,
}

impl PureForwardGraph {
    pub fn new(size: usize) -> Self {
        PureForwardGraph {
            map: HashMap::new(),
            size
        }
    }

    pub fn get_forward(&self, exporter: usize, forwarder: usize) -> Option<&PureForward> {
        self.map.get(&(exporter, forwarder))
    }

    pub fn add_forward(&mut self, exporter: usize, forwarder: usize, fwd: PureForward) {
        self.map.insert((exporter, forwarder), fwd).expect_none("Duplicate forward inserted");
    }

    /// Get all namespaces which forward from this one
    pub fn get_consumers(&self, exporter: usize) -> Vec<usize> {
        self.map.keys()
            .filter(|key| key.0 == exporter)
            .map(|key| key.1)
            .collect()
    }

    /// Get all namespaces that this one has a forward for
    pub fn get_suppliers(&self, forwarder: usize) -> Vec<usize> {
        self.map.keys()
            .filter(|key| key.1 == forwarder)
            .map(|key| key.0)
            .collect()
    }

    /// Determines the pure forward cycles in this graph.
    /// No node will appear in more than one cycle;
    /// any cycles that intersect will be merged into one "aggregate" cycle.
    pub fn get_cycles(&self) -> HashMap<usize, HashSet<usize>> {
        // visit
        let cycles: Vec<HashSet<usize>> = vec![];
        self.cycles_visitor(0, &mut vec![], &mut HashSet::new(), &mut cycles);
        // assemble map
        let map = HashMap::new();
        for cycle in cycles {
            for ns in cycle { map.insert(ns, cycle); }
        }
        map
    }

    /// Performs a recursive aggregate cycles algorithm for a starting namespace, given the current recursion path,
    /// set of visited namespaces, and current set of cycles.
    /// 
    /// For each consumer of the namespace, check to see if it exists in the current recursion path.
    /// If it does, the path between the two namespaces either needs to be merged into an existing cycle
    /// or added as a new cycle.
    /// This is a depth-first search algorithm.
    /// Once every consumer of the namespace is visited, the namespace is marked visited and the algorithm will
    /// ascend back to the previous namespace.
    /// If there are no namespaces left in the chain, the algorithm moves to the next namespace in the graph and starts
    /// a new chain.
    /// The algorithm is finished once every namespace in the graph has been visited, either by recursion from
    /// an existing namespace or by iteration.
    fn cycles_visitor(
        &self,
        ns: usize,
        current_path: &mut Vec<usize>,
        visited: &mut HashSet<usize>,
        cycles: &mut Vec<HashSet<usize>>
    ) {
        // break recursion if we're out of namespaces or the namespace has already been visited
        if ns >= self.size || visited.contains(&ns) { return; }

        current_path.push(ns);
        for consumer in self.get_consumers(ns) {
            if consumer == ns {
                // TODO: figure out how to get diagnostics here (possibly just add another method to check for this)
                // for posterity: if this is true, the namespace has a pure forward to itself, which should be just a warning
            } else if let Some(consumer_index) = current_path.iter().position(|&n| n == consumer) {
                // we have a cycle, gather all namespaces in the path
                let cycle = &current_path[consumer_index..];
                // check to see if there is an existing cycle containing ANY of them
                if let Some(existing_cycle) = cycles.iter().find(|c| cycle.iter().any(|n| c.contains(n))) {
                    // existing cycle, merge all of these into it
                    existing_cycle.extend(cycle);
                } else {
                    // no existing cycle, add one
                    cycles.push(cycle.iter().cloned().collect());
                }
            } else {
                // no cycle, recurse to consumer
                self.cycles_visitor(consumer, current_path, visited, cycles);
            }
        }

        // namespace is now visited
        current_path.pop();
        visited.insert(ns);
        if current_path.len() == 0 {
            // starting namespace in the path is finished, increment namespace number and recurse
            self.cycles_visitor(ns + 1, current_path, visited, cycles);
        }
    }
}
