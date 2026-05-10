use crate::next::{syntax::SyntaxKind, lexer::LexerToken};
use text_size::{TextRange, TextSize};

/// A token consumed by the parser
#[derive(Debug, Copy, Clone, Eq, PartialEq)]
pub struct ParserToken {
    /// The type of token
    pub kind: SyntaxKind,
    /// Is the current token joined to the next one (`> >` vs `>>`).
    pub is_jointed_to_next: bool,
}

pub struct TokenSource<'t> {
    /// raw text from the source file
    text: &'t str,
    /// start position of each token (except trivias)
    start_offsets: Vec<TextSize>,
    /// non-trivia tokens
    tokens: Vec<LexerToken>,
    /// Current token and index within tokens list
    curr: (ParserToken, usize),
}

impl<'t> TokenSource<'t> {
    pub fn new(text: &'t str, raw_tokens: &'t [LexerToken]) -> TokenSource<'t> {
        let mut tokens = Vec::new();
        let mut start_offsets = Vec::new();
        let mut len = 0.into();
        for &token in raw_tokens.iter() {
            if !token.kind.is_trivia() {
                tokens.push(token);
                start_offsets.push(len);
            }
            len += token.len;
        }

        let first = Self::make_parser_token(0, &start_offsets, &tokens);
        TokenSource { text, start_offsets, tokens, curr: (first, 0) }
    }

    /// Get the current token
    pub fn current(&self) -> ParserToken {
        self.curr.0
    }

    /// Get the token at a relative offset from the current token
    pub fn lookahead_nth(&self, n: usize) -> ParserToken {
        Self::make_parser_token(self.curr.1 + n, &self.start_offsets, &self.tokens)
    }

    /// Advance the token source forward one token
    pub fn bump(&mut self) {
        if self.curr.0.kind == SyntaxKind::EOF {
            return;
        }

        let pos = self.curr.1 + 1;
        self.curr = (Self::make_parser_token(pos, &self.start_offsets, &self.tokens), pos);
    }

    /// Returns true if the current token's text matches the provided keyword
    pub fn is_keyword(&self, kw: &str) -> bool {
        let pos = self.curr.1;
        if pos >= self.tokens.len() {
            return false;
        }
        let range = TextRange::at(self.start_offsets[pos], self.tokens[pos].len);
        self.text[range] == *kw
    }

    /// Build a `ParserToken` for the token at the given position
    fn make_parser_token(pos: usize, start_offsets: &[TextSize], tokens: &[LexerToken]) -> ParserToken {
        let kind = tokens.get(pos).map(|t| t.kind).unwrap_or(SyntaxKind::EOF);
        let is_jointed_to_next = if pos + 1 < start_offsets.len() {
            start_offsets[pos] + tokens[pos].len == start_offsets[pos + 1]
        } else {
            false
        };
    
        ParserToken { kind, is_jointed_to_next }
    }
}
