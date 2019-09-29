# A Brief Explanation of Parsing

Parsing isn't something everyone understands, so this is a basic runthrough of the problem of parsing, how it is typically solved, and how Ren has decided to go about it.

Parsing is, at its most basic, converting text to meaningful structured data that can be further processed by a program. Parsing is one of the most important problems of programming. A large number of tasks involve converting text to structured data apart from interpreters and compilers, though it is certainly most prevalent in those kinds of programs because of the complexity of the text being parsed. Parsing is also particularly interesting because it is so prevalent, yet it requires a lot more base knowledge to understand than most problems in programming.

While parsing has many different strategies, one thing that all parsers have in common is a *grammar*, which is a formal description of a language, such as a programming language. Grammars are complicated in and of themselves because they have several levels of complexity and various notation strategies.

## Grammars and the Chomsky Hierarchy

One of the pioneers in grammar and parsing theory was Noam Chomsky, who funnily enough was not actually a computer scientist, but a linguist. This fact alone describes how close programming language parsing is to natural language parsing.

Noam Chomsky formalized what is called the "Chomsky Hierarchy" of languages, which specifies four levels of complexity in language/grammar. Before we can go into the hierarchy, we need to settle some terminology around languages:

* *Language*: A language is a theoretical construct that specifies rules (a *grammar*) for how to process and understand written (or typed) text. A language is mostly an idea composed of several more concrete components. For example, Ren is a programming language that specifies a grammar for the syntax of the language, as well as a ton of other rules for how valid syntax is further processed semantically.
* *Grammar*: A grammar is a formal set of rules (called "productions") that specifies how to parse text of a specific language. It is represented as a list of productions, where each production is represented by two strings of symbols separated by an arrow (e.g. `abc -> def`). These symbols are either *terminals* or *non-terminals* (explained below). Each production represents an "expansion" from the left string to the right string. This is how syntax trees are produced. Every node is an instance of a left-side string, and all of its children are each symbol in the right-side string. Every grammar also has a "start symbol", which specifies which production to start at for the parsing process.
* *Terminal*: A terminal is a symbol that cannot be expanded, i.e. a token. Terminals are the concrete structures of the grammar; they specify where a parse path stops successfully, and that parsing should continue with the next terminal.
* *Non-terminal*: A non-terminal is a symbol that expands into a string of one or more other symbols, which can be either terminals or other non-terminals. While a non-terminal is being processed, it means that the parse path is not complete, as further expansion is required.
* *Automaton*: For every level of grammar, there is a corresponding automaton that can parse all grammars within that level. An automaton is a theoretical machine with a formalized state and method of operation, and is designed for processing strings of tokens according to a grammar. A parser is an implementation of an automaton.

Now that that is out of the way, here is the Chomsky Hierarchy:

### Type-3 (Regular Languages)
 
Regular languages are the simplest types of languages: those that can be parsed from left to right in a linear operation. All productions of regular languages are of the form `a -> b` or `a -> bc`, where `a` is always a non-terminal, `b` is always a terminal, and `c` is always a single terminal or non-terminal. In this way, every production will always consume one terminal, and which production to use is always immediately decidable.
 
If you're wondering if the word "regular" has anything to do with regular expressions, you would be correct. It turns out that regular grammars are useful enough that someone invented a syntax for creating parsers of regular languages, which is where regular expressions came from.
 
The automaton used to parse regular languages is called a "finite state automaton" (FSA) or often just a "state machine". A FSA is a simple machine with several states linked by transition arrows. There is one start state and one or more completion states. Each consumed character chooses a transition arrow to transition to another state. The string is parsed successfully if it lands on a completion state after it is finished.
 
Regular language parsers are typically used to perform lexical analysis on programs to turn a stream of characters to a stream of tokens. In these "tokenizers", the terminals are individual characters, and the non-terminals that are parsed form tokens.

### Type-2 (Context-Free Languages)

Context-free languages are the type of language of concern to us in parsing. They are more complex than regular languages in that the right-side string has no restrictions; it can be composed of any number of terminals and non-terminals in any order.

These languages are called "context-free" because any given non-terminal has a fixed set of potential productions that do not depend at all on the surrounding text. This may seem confusing, because programming languages are definitely context-sensitive. To account for this, parsers are usually implemented to parse a looser subset of the actual language. This has several benefits, primarily that context-free languages are far easier to understand and far easier (and more performant) to implement. Any other context-sensitive logic is implemented in the next stage of the compiler.

Context-free languages are parsed using an automaton called a "(non-deterministic) pushdown automaton". A pushdown automaton is simply a state machine with a stack alongside it. Each transition now not only factors in the next token in the stream but also the current symbol on top of the stack, and the transition specifies not only the next state but also optionally a new symbol to push onto the stack. In this way context-free parsers can try multiple parse paths, and go with the first successful path it finds. If there is no valid transition specified given the current token and stack symbol, it will backtrack.

I specified the "non-deterministic" qualifier in parentheses because technically given the nature of context-free grammars, it is possible to specify grammars for which there is more than one possible parse path for a given string, producting ambiguity. True context-free parsers need to be able to handle this, and theoretically they would wind up outputting potentially several equally valid syntax trees for any given source string. However, these kinds of languages are not useful in programming, where we expect only one result, so grammars for programming languages typically add restrictions to remove ambiguity, allowing a *deterministic* pushdown automaton to be used instead, which is far more practical to real-life scenarios.

### Type-1 (Context-Sensitive Languages) and Type-0 (Recursively Enumerable Languages)

Type-1 and Type-0 languages are typically not observed in the context of programming languages because they are far more complex to understand and to implement, and all practical scenarios are easily handled by context-free grammars. These languages remove more of the restrictions placed on productions of the prior levels, and Type-0 languages even specify that there can be any sequence of any kind of symbol on either side of the arrow (but the left-side must contain one non-terminal).

The automaton capable of parsing these languages is called the Turing Machine, which expands further on the concept of a pushdown automaton. Any further explanation is beyond the scope of this documentation.

The only thing I will mention is that Turing Machines are a theoretical basis of computing in general beyond just parsing. I could theoretically create a Type-1 or Type-0 grammar that fully describes the syntax and semantics of the Ren programming language, and use a Turing machine to not only parse Ren programs, but also execute them. However, the grammar would be massive and difficult to understand, and since Turning Machines have such a simple mechanism of operation, programs would take thousands of times longer to run than is acceptable in today's age. This is where the border between the theoretical and the practical is quite black and white.

### More Information

See the [Wikipedia entry](https://en.wikipedia.org/wiki/Context-free_grammar) on Context-Free Grammars for more information if the above did not make sense.

## Types of Parsers

Now that we know how grammars are structured, we can go into how parsers actually work.

There are many varieties of parser implementations. Three of the most important factors in choosing a parsing strategy are:

> Is the text parsed left-to-right or right-to-left?

This one is fairly simple. Do we start at the start of the input and consume left to right, or do we start at the end of the input and consume right to left? Nearly all parsers in use today are consumed left to right, so that the grammars are easier to write and the parser logic is easiler to understand. Additionally, choosing the direction of input consumption determines how you need to handle recursion. Context-free grammars are allowed to be recursive, where the first symbol of the right side of a production is the same as the non-terminal on the left side. However, when implementing this practically, when you follow the expansion process, it would result in infinite recursion because we'll never follow an expansion that results in consuming a token. When this happens in a grammar, it needs to be rewritten so that the recursion is eliminated. There is always a way to do this, which we will describe when we dig into the implementation.

> Is the text parsed bottom-up or top-down?

This one is a bit harder to understand, because when you look at a grammar, you'd think that top-down is the only way to do it. You start at the start symbol and descend productions until you are able to consume tokens, then continue. However, parsers that work this way can actually parse fewer languages than those that work bottom up. Bottom up parsers work by consuming tokens from the input and trying to find a production that matches, working their way backwards toward the start symbol. There is a tradeoff here: top-down parsers are easier to write and understand but are less powerful, while bottom-up parsers are more powerful but harder to write.

> How much lookahead do we want to allow?

It is not always possible to take a symbol from the input and immediately know which production to follow. Some productions have 4 or more symbols that are exactly the same. In these instances, you need to be able to "look ahead" to more symbols of the input in order to know which production to use. Some parsers have a fixed number of lookahead tokens, while others have a configurable number. The simplest parsers have only one token of lookahead, which can only be used to parse a subset of context-free languages. However, there are also parsers that don't care about lookahead. The purpose of lookahead is to choose what production to follow when there is a branch. Another option in this scenario is to simply follow all branches and pick the first one that works successfully. Parsers that do this are very easy to implement. The only other thing to consider for these parsers is the order that the branches are attempted, which has a surprising impact on the parser logic. Usually you want the first branch to be the one that consumes the most number of tokens.

There are several common parser types, each of which has a corresponding subset of context-free languages it can parse:
* LL(1): This is the simplest type of parser: "L" (left-to-right), "L" (top-down, same direction as consumption), with one token of lookahead.
* LR(1): "L" (left-to-right), "R" (bottom-up, opposite direction as consumption), with one token of lookahead
* LL(k): LL parser with a specific, but configurable, amount of lookahead
* LL(*): LL parser that automatically computes the required lookahead from the provided grammar
* LALR: A variation of LR that is simpler to implement and more performant at the expense of a small amount of power. Most generated parsers today are LALR
* PEG (parsing expression grammar): A different kind of parser which parses LL-like languages with no lookahead by specifying an order of precedence for branches. PEGs also include extra grammar syntax similar to regular expression syntax that make it much easier to specify grammars.

## Implementing Parsers

When implementing a parser, one needs to consider two things:
* How to specify the grammar (text representation or manually in code)
* The parsing algorithm (top-down parsers typically use some form of recursive descent, while bottom-up parsers typically use tables with a corresponding state machine)

The second consideration is typically the important one, and it comes down to one decision: do I want to write the parser from scratch or do I want to generate the parser using a tool? This decision typically decides everything else for you.

Writing a parser from scratch usually involves specifying a rough grammar which you will then implement effectively 1:1 as a "recursive descent" parser. In a recursive descent parser, each non-terminal of the grammar is implemented as a function. That function will do two things: (1) decide which production to follow, and (2) consume tokens and call other non-terminal functions to "follow" the chosen production. These kinds of parsers are very easy to understand because the implementation mirrors the grammar specification. PEG and LL are well-suited for this implementation. The benefit of this is that you have full control over the implementation. You can do it in whatever language you please, and the API can be exactly as you specify. The drawback is that you may suffer performance issues, because recursive descent parsers (especially those that do not use memoization) are far slower than generated alternatives. It is also more work because you need to write all the logic yourself.

Generating a parser involves writing a grammar according to a grammar syntax specified by a tool (such as Yacc or ANTLR) and running the tool on the grammar to generate a library that provides an API to parse the language specified by that grammar. Most of these tools generate LALR parsers (though ANTLR uses a variant of LL(*)) that are implemented using parse tables. The benefits of this strategy are that all you have to write is the grammar, and the parser is likely to be very performant. The drawback is that you are limited by both the language(s) and API of the tool you're using. Most popular parser generators support several languages, but you are still forced to use whatever API the parser specifies, making it difficult to conform the parser to your compiler's paradigm or inject your own logic.

Since most compilers end up being self-hosting (they are written in the very language they compile), it is generally better to roll your own parser, which is what we have done in Ren. Ren implements a recursive-descent PEG parser using a custom-built library designed to make parser implementation expressive.