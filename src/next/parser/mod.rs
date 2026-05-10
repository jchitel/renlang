mod api;
mod event;
mod token_source;
mod tree_sink;

use rowan::GreenNode;
use super::lexer::tokenize;
use super::syntax::SyntaxError;
use api::Parser;
use event::process_events;
use token_source::TokenSource;
use tree_sink::TreeSink;

pub fn parse_text(text: &str) -> (GreenNode, Vec<SyntaxError>) {
    let (tokens, lexer_errors) = tokenize(&text);

    let mut token_source = TokenSource::new(text, &tokens);
    let mut tree_sink = TreeSink::new(text, &tokens);

    parse_from_tokens(&mut token_source, &mut tree_sink, grammar::root);

    let (tree, mut parser_errors) = tree_sink.finish();
    parser_errors.extend(lexer_errors);

    (tree, parser_errors)
}

fn parse_from_tokens<'t, F>(token_source: &'t mut TokenSource<'t>, tree_sink: &mut TreeSink, f: F)
where
    F: FnOnce(&mut Parser),
{
    let mut p = Parser::new(token_source);
    f(&mut p);
    let events = p.finish();
    process_events(tree_sink, events);
}

mod grammar {
    use super::Parser;

    pub fn root(_p: &mut Parser) {
        unimplemented!()
    }
}