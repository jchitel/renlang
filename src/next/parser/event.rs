use super::tree_sink::TreeSink;
use crate::next::syntax::SyntaxKind;
use std::mem;

/// Parser events used to build the syntax tree
pub enum Event {
    /// Starts a new node.
    /// 
    /// This event may be later abandoned in the event of a failed or alternative parse.
    /// 
    /// If `forward_parent` is set, this node has a parent whose `Start` event comes later.
    /// This is to support left-recursive grammatical structures, where you won't know
    /// until after parsing a valid node whether that node is a child of some other node.
    /// The `u32` is the index in the events list of this parent `Start` event.
    /// This effect can be chained.
    Start {
        abandoned: bool,
        kind: SyntaxKind,
        forward_parent: Option<usize>,
    },

    /// Complete the previous `Start` event
    Finish,

    /// Produce a single leaf-element.
    /// `n_raw_tokens` is used to glue complex contextual tokens.
    /// For example, lexer tokenizes `>>` as `>`, `>`, and
    /// `n_raw_tokens = 2` is used to produced a single `>>`.
    Token {
        kind: SyntaxKind,
        n_raw_tokens: u8,
    },

    /// Produce a syntax error at the current location.
    Error {
        msg: String,
    },
}

impl Event {
    /// Produce an abandoned `Start` event
    pub fn abandoned() -> Self {
        Event::Start { abandoned: true, kind: SyntaxKind::EOF, forward_parent: None }
    }
}

pub fn process_events(tree_sink: &mut TreeSink, mut events: Vec<Event>) {
    for i in 0..events.len() {
        match events[i] {
            // abandoned start events do nothing
            Event::Start { abandoned: true, .. } => (),
            Event::Start { kind, forward_parent, .. } => {
                // here we assemble the forward_parent chain
                let mut forward_parents = vec![];
                // start with the current node
                forward_parents.push(kind);

                // follow the chain
                let mut forward_parent = forward_parent;
                while let Some(fp) = forward_parent {
                    // get the next parent, replace it with an abandoned event
                    forward_parent = match mem::replace(&mut events[fp], Event::abandoned()) {
                        Event::Start { abandoned, kind, forward_parent } => {
                            if !abandoned {
                                // not abandoned, include it
                                forward_parents.push(kind);
                            }
                            forward_parent
                        }
                        _ => unreachable!(),
                    };
                }

                // process the chain in reverse order
                for kind in forward_parents.drain(..).rev() {
                    tree_sink.start_node(kind);
                }
            }
            Event::Finish => tree_sink.finish_node(),
            Event::Token { kind, n_raw_tokens } => tree_sink.token(kind, n_raw_tokens),
            Event::Error { ref msg } => tree_sink.error(msg.clone()),
        }
    }
}
