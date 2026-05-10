use rowan::{GreenNode, SmolStr};
use crate::next::{
    syntax::{SyntaxError, SyntaxTreeBuilder, SyntaxKind},
    lexer::LexerToken
};
use text_size::{TextRange, TextSize};
use std::mem;

/// A tree sink is a struct that receives commands used to build a tree from a sequence of tokens.
/// It contains a reference to the raw text, the token sequence, and an internal tree builder.
/// 
/// This allows a clean abstract API to be provided to the parser,
/// which will not have to care about trivia tokens or even referencing the raw text.
pub struct TreeSink<'a> {
    /// The raw text from the source file
    text: &'a str,
    /// The sequence of tokens from the lexer
    tokens: &'a [LexerToken],
    /// The text offset of the current token
    text_pos: TextSize,
    /// The index of the current token in the token sequence
    token_pos: usize,
    /// The current internal state of the tree sink
    state: State,
    /// The inner tree builder that will eventually output the tree
    inner: SyntaxTreeBuilder,
}

/// Internal state of the tree sink
enum State {
    /// Initial state: about to receive the first command.
    /// 
    /// The purpose of this state is to direct `start_node()` to ignore the logic
    /// for attaching trivias to a previous node, because there won't be one.
    PendingStart,
    /// In the middle of processing a node
    /// 
    /// This directs the "default behavior" or the tree sink.
    Normal,
    /// Just finished a node
    /// 
    /// The purpose of this state is to ensure that the next command
    /// actually finishes the node. When the final `finish()` is called,
    /// this ensures that all remaining trivias are consumed for the last node.
    PendingFinish,
}

impl<'a> TreeSink<'a> {
    pub fn new(text: &'a str, tokens: &'a [LexerToken]) -> Self {
        Self {
            text,
            tokens,
            text_pos: 0.into(),
            token_pos: 0,
            state: State::PendingStart,
            inner: SyntaxTreeBuilder::default(),
        }
    }

    /// Add a token as a child of the current in-progress node
    /// 
    /// `n_tokens` allows multiple raw jointed tokens to be treated as one.
    pub fn token(&mut self, kind: SyntaxKind, n_tokens: u8) {
        // Set the state to normal
        match mem::replace(&mut self.state, State::Normal) {
            // start_node() must have been called at least once before this
            State::PendingStart => unreachable!(),
            // If it was pending finish, finish the previous node
            State::PendingFinish => self.inner.finish_node(),
            // Otherwise do nothing
            State::Normal => (),
        }
        // Consume all trivias for the current node
        self.eat_trivias();

        // Compute the total length and add the token
        let n_tokens = n_tokens as usize;
        let len = self.tokens[self.token_pos..self.token_pos + n_tokens]
            .iter()
            .map(|it| it.len)
            .sum::<TextSize>();
        self.do_token(kind, len, n_tokens);
    }

    /// Start a new node as a child of the current in-progress node
    pub fn start_node(&mut self, kind: SyntaxKind) {
        // Set the state to normal
        match mem::replace(&mut self.state, State::Normal) {
            // If we were pending start and have started a new node, we can start it and then we're done.
            State::PendingStart => {
                self.inner.start_node(kind);
                // No need to attach trivias to previous node: there is no previous node.
                return;
            }
            // If we were pending finish and are now starting a new node, we can finish the previous one.
            State::PendingFinish => self.inner.finish_node(),
            // Otherwise do nothing
            State::Normal => (),
        }

        // Compute trivias attached to the current node and the next node
        let (n_current, n_next) = self.compute_trivia_counts(kind);
        // Consume trivias for the current node
        self.eat_n_trivias(n_current);
        // Start the new node
        self.inner.start_node(kind);
        // Consume trivias for the new node
        self.eat_n_trivias(n_next);
    }

    /// Finish the current node, shifting back up to the parent
    pub fn finish_node(&mut self) {
        // Set the state to pending finish, we might be done
        match mem::replace(&mut self.state, State::PendingFinish) {
            // start_node() must have been called at least once before this
            State::PendingStart => unreachable!(),
            // If we were pending finish and are now finishing another node, we can finish the previous one.
            State::PendingFinish => self.inner.finish_node(),
            // Otherwise do nothing
            State::Normal => (),
        }
    }

    /// Add an error to be returned with the resulting syntax tree
    pub fn error(&mut self, error: String) {
        self.inner.error(error, self.text_pos)
    }

    /// Finish processing, returning a raw syntax tree and a list of errors
    pub fn finish(mut self) -> (GreenNode, Vec<SyntaxError>) {
        match mem::replace(&mut self.state, State::Normal) {
            // We *must* have been pending finish; consume all remaining trivia and finish the last node
            State::PendingFinish => {
                self.eat_trivias();
                self.inner.finish_node()
            }
            // finish_node() must have been called immediately prior to this
            State::PendingStart | State::Normal => unreachable!(),
        }

        self.inner.finish_raw()
    }

    /// Consume all trivias until the next non-trivia token, adding each to the current node.
    fn eat_trivias(&mut self) {
        while let Some(&token) = self.tokens.get(self.token_pos) {
            if !token.kind.is_trivia() {
                break;
            }
            self.do_token(token.kind, token.len, 1);
        }
    }

    /// Consume a specific number of trivias, adding each to the current node.
    fn eat_n_trivias(&mut self, n: usize) {
        for _ in 0..n {
            let token = self.tokens[self.token_pos];
            assert!(token.kind.is_trivia());
            self.do_token(token.kind, token.len, 1);
        }
    }

    /// Add a single token to the current node and advance the positions
    fn do_token(&mut self, kind: SyntaxKind, len: TextSize, n_tokens: usize) {
        let range = TextRange::at(self.text_pos, len);
        let text: SmolStr = self.text[range].into();
        self.text_pos += len;
        self.token_pos += n_tokens;
        self.inner.token(kind, text);
    }

    /// Computes the number of inter-node trivias.
    /// Some trivias will be attached to the previous node and some will be attached to the next node.
    /// 
    /// This is computed via the following logic:
    /// 
    /// By default, any trivias between nodes are attached to the preceding node.
    /// However, some syntax kinds (primarily declarations) can have doc comments,
    /// which should be attached to those nodes instead of the preceding node.
    /// Any doc comments which immediately precede a node of these kinds, uninterrupted by
    /// a non-doc comment, is included. Whitespace has no effect on this, but any whitespace
    /// preceding the first included doc comment is **not** included.
    fn compute_trivia_counts(&self, kind: SyntaxKind) -> (usize, usize) {
        // Total trivias
        let n_trivias =
            self.tokens[self.token_pos..].iter().take_while(|it| it.kind.is_trivia()).count();

        // If the next node kind can't have an outer doc comment, then everything goes to the current node.
        if !kind.can_have_outer_doc_comment() {
            return (n_trivias, 0);
        }

        // Get the number of trivias which *may be* attached to the next node:
        // whitespace or outer doc comments succeeding any other kind of trivia
        let mut pos = self.text_pos;
        let n_maybe_attached = &self.tokens[self.token_pos..self.token_pos + n_trivias].iter()
            .map(|it| {
                let text = &self.text[TextRange::new(pos, pos + it.len)];
                pos = pos + it.len;
                (it.kind, text)
            })
            .rev()
            .take_while(|(kind, text)| {
                *kind == SyntaxKind::Whitespace || (*kind == SyntaxKind::Comment && text.starts_with("///"))
            })
            .count();
        // Get the number of whitespace tokens to not include
        let maybe_range = (self.token_pos + n_trivias - n_maybe_attached)..(self.token_pos + n_trivias);
        let n_removed_whitespace = &self.tokens[maybe_range].iter()
            .take_while(|it| { it.kind == SyntaxKind::Whitespace })
            .count();
        
        // return two numbers:
        // 1. trivias attached to the current node: total trivias minus the maybes plus removed whitespace
        // 2. trivias attached to the next node: maybes minus removed whitespace
        (n_trivias - n_maybe_attached + n_removed_whitespace, n_maybe_attached - n_removed_whitespace)
    }
}
