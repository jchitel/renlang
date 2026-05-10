use drop_bomb::DropBomb;
use super::{
    event::Event,
    token_source::TokenSource
};
use crate::next::syntax::SyntaxKind;

/// API for grammar implementation to consume tokens and construct the syntax tree.
/// 
/// The parser builds a sequence of events that will then be used to build the tree.
pub struct Parser<'t> {
    /// Provides tokens from the source file
    token_source: &'t mut TokenSource<'t>,
    /// List of events used to build the tree
    events: Vec<Event>,
}

impl<'t> Parser<'t> {
    pub fn new(token_source: &'t mut TokenSource<'t>) -> Self {
        Parser {
            token_source,
            events: vec![]
        }
    }

    pub fn finish(self) -> Vec<Event> {
        self.events
    }

    /// Returns the kind of the current token
    pub fn current(&self) -> SyntaxKind {
        self.nth(0)
    }

    /// Lookahead to the kind of the nth token from current
    pub fn nth(&self, n: usize) -> SyntaxKind {
        // TODO: do we need this?
        assert!(n <= 3);

        self.token_source.lookahead_nth(n).kind
    }

    /// Checks if the current token is `kind`.
    pub fn current_is_kind(&self, kind: SyntaxKind) -> bool {
        self.nth_is_kind(0, kind)
    }

    /// Checks if the nth token is `kind`
    pub fn nth_is_kind(&self, n: usize, kind: SyntaxKind) -> bool {
        match kind {
            // Check composite symbol tokens, starting with 2...
            // SyntaxKind::MinusEquals => self.nth_is_kind_composite2(n, SyntaxKind::Minus, SyntaxKind::Equals),

            // ...then 3
            // SyntaxKind::Ellipsis => self.nth_is_kind_composite3(n, SyntaxKind::Dot, SyntaxKind::Dot, SyntaxKind::Dot),

            // otherwise assume 1
            _ => self.token_source.lookahead_nth(n).kind == kind,
        }
    }

    /// Checks if nth composite-2 token matches the component kinds
    fn nth_is_kind_composite2(&self, n: usize, k1: SyntaxKind, k2: SyntaxKind) -> bool {
        let t1 = self.token_source.lookahead_nth(n);
        let t2 = self.token_source.lookahead_nth(n + 1);
        t1.kind == k1 && t1.is_jointed_to_next && t2.kind == k2
    }

    /// Checks if nth composite-3 token matches the component kinds
    fn nth_is_kind_composite3(&self, n: usize, k1: SyntaxKind, k2: SyntaxKind, k3: SyntaxKind) -> bool {
        let t1 = self.token_source.lookahead_nth(n);
        let t2 = self.token_source.lookahead_nth(n + 1);
        let t3 = self.token_source.lookahead_nth(n + 2);
        (t1.kind == k1 && t1.is_jointed_to_next)
            && (t2.kind == k2 && t2.is_jointed_to_next)
            && t3.kind == k3
    }

    /// Consume the next token if `kind` matches, returning whether anything was consumed.
    pub fn eat(&mut self, kind: SyntaxKind) -> bool {
        if !self.current_is_kind(kind) {
            return false;
        }

        let n_raw_tokens = match kind {
            // Determine number of tokens to consume for composites, starting with 2...
            // SyntaxKind::MinusEquals
            // | SyntaxKind::ThinArrow => 2,

            // ...then 3
            // SyntaxKind::Ellipsis | SyntaxKind::InclusiveRange => 3,

            // otherwise assume 1
            _ => 1,
        };

        self.do_bump(kind, n_raw_tokens);
        true
    }

    /// Checks if the current token matches a contextual keyword
    pub fn at_contextual_kw(&self, kw: &str) -> bool {
        self.token_source.is_keyword(kw)
    }

    /// Starts a new node in the syntax tree. All nodes and tokens
    /// consumed between the `start` and the corresponding `Marker::complete`
    /// belong to the same node.
    pub fn start(&mut self) -> Marker {
        let pos = self.events.len();
        self.push_event(Event::abandoned());
        Marker::new(pos)
    }

    /// Consume the next token if `kind` matches, panicking otherwise.
    pub fn bump(&mut self, kind: SyntaxKind) {
        assert!(self.eat(kind));
    }

    /// Advances the parser by one token regardless of kind
    pub fn bump_any(&mut self) {
        let kind = self.nth(0);
        if kind == SyntaxKind::EOF {
            return;
        }
        self.do_bump(kind, 1)
    }

    /// Advances the parser by one token, remapping its kind.
    /// This is useful to create contextual keywords from
    /// identifiers. For example, the lexer creates an `union`
    /// *identifier* token, but the parser remaps it to the
    /// `union` keyword, and keyword is what ends up in the
    /// final tree.
    pub fn bump_remap(&mut self, kind: SyntaxKind) {
        // EOF cannot be remapped
        assert!(self.current() != SyntaxKind::EOF);
        self.do_bump(kind, 1);
    }

    /// Emit error with the `message`
    pub fn error<T: Into<String>>(&mut self, message: T) {
        self.push_event(Event::Error { msg: message.into() })
    }

    /// Consume the next token if it is `kind` or emit an error otherwise.
    /// Returns whether anything was consumed
    pub fn expect(&mut self, kind: SyntaxKind) -> bool {
        if self.eat(kind) {
            return true;
        }
        self.error(format!("expected {:?}", kind));
        false
    }

    /// Create an error node and consume the next token (unless it is a brace).
    pub fn err_and_bump(&mut self, message: &str) {
        self.err_recover(message, vec![]);
    }

    /// Create an error node and consume the next token
    /// (unless it is a brace or belongs to the provided recovery list).
    pub fn err_recover(&mut self, message: &str, recovery: Vec<SyntaxKind>) {
        match self.current() {
            SyntaxKind::OpenBrace | SyntaxKind::CloseBrace => {
                self.error(message);
                return;
            }
            _ => (),
        }

        if recovery.contains(&self.current()) {
            self.error(message);
            return;
        }

        let m = self.start();
        self.error(message);
        self.bump_any();
        m.complete(self, SyntaxKind::Error);
    }

    /// Push a `Token` event and advance the token source by the number of raw tokens.
    fn do_bump(&mut self, kind: SyntaxKind, n_raw_tokens: u8) {
        for _ in 0..n_raw_tokens {
            self.token_source.bump();
        }

        self.push_event(Event::Token { kind, n_raw_tokens });
    }

    /// Push an event
    fn push_event(&mut self, event: Event) {
        self.events.push(event)
    }
}

/// A reference to a started node.
/// A `Marker` must be explicitly completed or abandoned before it can be dropped.
pub struct Marker {
    /// The index of the `Start` event referenced by this `Marker`
    idx: usize,
    /// Panics if this `Marker` is dropped without being handled first.
    bomb: DropBomb,
}

impl Marker {
    fn new(idx: usize) -> Marker {
        Marker { idx, bomb: DropBomb::new("Marker must be either completed or abandoned") }
    }

    /// Finishes the node and assigns `kind` to it,
    /// returning a `CompletedMarker` for future operations on the node.
    pub fn complete(mut self, p: &mut Parser, kind: SyntaxKind) -> CompletedMarker {
        self.bomb.defuse();
        match p.events[self.idx] {
            Event::Start { abandoned: ref mut abandoned, kind: ref mut slot, .. } => {
                *abandoned = false;
                *slot = kind;
            }
            _ => unreachable!(),
        }
        let finish_idx = p.events.len();
        p.push_event(Event::Finish);
        CompletedMarker::new(self.idx, finish_idx, kind)
    }

    /// Abandons the syntax tree node. All its children
    /// will be attached to its parent instead.
    pub fn abandon(mut self) {
        self.bomb.defuse();
        // the event is already marked abandoned, so leave it as is
    }
}

/// Represents a completed node, providing an API to retroactively move the node under a new parent
/// or undo the node completely.
pub struct CompletedMarker {
    /// The index of the `Start` event for this node
    start_idx: usize,
    /// The index of the `Finish` event for this node
    finish_idx: usize,
    /// The kind of the node
    kind: SyntaxKind,
}

impl CompletedMarker {
    fn new(start_idx: usize, finish_idx: usize, kind: SyntaxKind) -> Self {
        CompletedMarker { start_idx, finish_idx, kind }
    }

    /// Creates a new node which starts *before* the current one.
    /// The parser could start node `A`, then complete it, and then after parsing the whole node,
    /// decide that it should have started some node `B` before starting `A`.
    /// A new `Marker` for `B` is returned.
    /// 
    /// See also docs about `forward_parent` in `Event::Start`.
    pub fn precede(self, p: &mut Parser) -> Marker {
        let new_marker = p.start();
        match p.events[self.start_idx] {
            // Set the forward_parent of the current start event to the index of the new start event
            Event::Start { ref mut forward_parent, .. } => {
                *forward_parent = Some(new_marker.idx);
            }
            _ => unreachable!(),
        }
        new_marker
    }

    /// Undo this completion and revert it to a `Marker`
    pub fn undo_completion(self, p: &mut Parser) -> Marker {
        match p.events[self.start_idx] {
            Event::Start { ref mut abandoned, forward_parent: None, .. } => *abandoned = true,
            _ => unreachable!(),
        }
        match p.events[self.finish_idx] {
            ref mut slot @ Event::Finish => *slot = Event::abandoned(),
            _ => unreachable!(),
        }
        Marker::new(self.start_idx)
    }

    pub fn kind(&self) -> SyntaxKind {
        self.kind
    }
}
