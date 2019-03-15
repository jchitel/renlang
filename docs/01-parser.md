# Parser

The first step of the compiler is the parser. There is a 4 step pipeline to parsing:

1. Read raw bytes from a file, creating a byte stream (*data sourcing*)
2. Stream the bytes through a UTF-8 decoder to produce a character stream (*character decoding*)
3. Stream the characters through a tokenizer to produce a token stream (*lexical analysis*)
4. Stream the tokens through a parser to produce a syntax tree (*syntactic analysis*)

I will not go into too much depth of what a lot of these terms mean. Here are some basic definitions:

* *stream*: A stream is a sequence of data similar to a queue where each item in the sequence is processed one at a time in order and then discarded. Streams are typically *lazy*, meaning that the source of the data is only read on demand. This is opposed to reading in the entire contents of a data source into a single buffer and then processing the buffer. Processing data typically involves creating multiple intermediate sequences, each containing the next step of the processing. Streaming allows each step in the process to be arranged in a pipeline so no data is duplicated, which conserves memory and is more performant.
* *token*: A token is a single unit of text in a parser, always composed of one or more (in special cases zero) characters. Any symbol, word, or other sequence of characters that represents a single unit of text is a token. Lexical analysis (tokenization) is the process responsible for turning a character stream into a token stream by combining some of the characters into tokens according to lexical rules.
* *syntax tree*: While a token stream is purely linear, a syntax tree is (as you may have guessed) a tree structure, with a single root node and potentially several child nodes, where each node can have any number of children. All leaf nodes of the syntax tree appear in the token stream in the same order from left to right (some tokens may be discarded as syntactically meaningless). The parent nodes represent high-level structures created by sequences of tokens and other nodes. The root node of a syntax tree represents the full text that was parsed. Syntactic analysis (parsing) is the process responsible for restructuring a token stream into a syntax tree using a specified grammar.

If you aren't familiar with parsing, [this](./02-parser-background.md) will give you a basic rundown of the theory and implementation of parsers, ending up with the rationale behind Ren's parsing strategy.

The first step of parsing, "tokenization" or "lexing", is out of the scope of this file. See [here](./03-lexer.md) for information on the lexical analysis being this parser.

## Implementation

The parser was particularly challenging to implement in a pure functional way, for many reasons:

* Reading a file has side effects (potential errors) and is inherently not referentially transparent (a given file could have vastly different contents at different times).
* Parsers track a lot of state, and sometimes have to backtrack if a particular parse path was not matched.
* Syntax specification is hard when you don't want to just do it as custom logic (which we didn't, because that has involved a lot of repetition in the past)

These problems were eventually resolved elegantly using a few strategies:

* Ignore the fact that reading a file isn't pure functional. Just assume it is referentially transparent and handle edge cases elegantly. There are really no consequences of this in TypeScript.
* Use a lazy list to avoid reading the file all at once, as well as more than once. Because the lazy lists are immutable, backtracking involves just returning with a flag indicating that the next branch of logic should be attempted.
* Use a syntax specification system built by composing functions that implement the parsing logic.

To describe how we landed here, for posterity's sake (and also because I'm very proud of it), I'd like to start at the very beginning of my journey into writing my own parser.

### History

#### From Humble Beginnings

I started my journey with a basic template of the process of an interpreter. You read a file, parse it, translate it to IR, and interpret those IR instructions, returning the resulting exit code.

The first thing I did was try to specify a basic grammar to start with. I ended up settling on a PEG because they are so beautiful to read and to write. This decision impacted most of the rest of the parser.

I knew that I wanted to write the parser from scratch, for two main reasons: (1) primarily for bragging rights, and (2) I wanted full control over the resulting API and internals. From there, I just needed to know how to implement said parser. At the time I was only aware of top-down parsers (I may have considered a bottom-up parser instead if I were starting now), so after a few minutes of internet searching, I discovered that the standard "from scratch" way to implement a top-down parser is to implement a recursive descent parser.

The next thing I wanted to do was implement the tokenizer, which took a while (see [here](03-lexer.md) for details). But once I got that into a good state, I was finally able to start working on the parser. As I got going, I started noticing certain patterns, so I extracted those into common methods. I realized that I needed a system to throw an error when invalid syntax was found, so I constructed a clever way to extract the location in the file based on the current place in the tokenizer. I also implemented AST nodes as classes, which looked quite nice to start out with.

As time drew on, I was generally unsatisfied with what I was writing. It was overly verbose and I wasn't getting the simplicity that I was promised from a recursive descent parser. I hoped to resolve this slightly by including the grammar specification alongside each non-terminal accept function, and I still looked to extract common logic wherever possible. But I trudged on an implemented the whole parser using the patterns I had.

Then when I started testing, I realized there were several places where ambiguity was going to be a problem. I ended up having to refactor a lot of the logic and reorder the parse order for several non-terminals to resolve that, but it effectively worked the same way: read one or more tokens to determine the path, try to consume child non-terminals, if successful continue, if not return false to indicate we need the next choice. I also consolidated my AST classes into fewer files because I hated having one file for each of the teeny tiny classes (I ended up backtracking on this decision much later).

But I did it! I had a working and completely tested parser, as unsatisfied as I was with it. But I didn't want to work on it anymore, so I continued with type checking. It was quickly apparent that my syntax nodes were insufficient. The nodes themselves needed to store location information for error reporting, so I added that. They also needed to be simplified to just semantic information so that the type checker doesn't have to muddy around with tokens. So I added the concept of a "reduce" function, one for each node type, to extract just the semantic info. I also added a Module class as a semantic container for a module and all of its components (as opposed to the Program syntax node which stores the syntax, because that's not confusing).

As needed by the type checker, I added elements to the syntax, which didn't prove too complicated. I added a "continue" keyword, "true" and "false" literals, an "any" type, and comments to the grammar. Eventually I got to the point where I needed to resolve the type of various nodes that have types. So I added another method to every typeable node for doing that. Suddenly these syntax classes were looking a bit bloated, and contained a whole lot of type checking logic, which isn't really their responsibility.

Once type checking was done, I blasted through translation (super easy) and interpreting (a bit difficult but mostly easy). I had what was theoretically a working interpreter. The frontend aspects (parsing and type checking) are the most complicated pieces of that. Once I started to taste the end, I could start thinking about what comes next. I obviously implemented this whole thing with very simple features, but in order to be practical, this compiler was going to need to be able to support much more complex features. I identified 5 features that needed to be implemented in order to start considering the language practical: classes, interfaces, overloads, extension methods, and generics. I order those based on dependency, and determined that I needed to start with generics.

So I began work on generics! Step 1 was to add generics to the parser. I started doing that and realized that in the time since I was working on the parser, I forgot how it worked, and it wasn't immediately obvious based on just looking at it. That was a problem, because I would need to return to the parser a lot if I was to continue maintaining this language. From there, I got kinda bummed out because I was going to have to work on the parser again, and I fell off consistent development for awhile. But I eventually got back into it, and decided to completely redefine the parser implementation into a generic framework.

#### The First Refactor: A Generic Framework For Parsing

The framework was composed of an "accept()" method which took a structure containing a specification of the non-terminal, very similar to a grammar specification. You could also specify qualifiers such as "?" (optional) or "*" (zero or more). You would also specify a class to use to construct a syntax node instance, and any other options. This was turning into something beautiful. However, it wasn't very elegant. The main issue was that the compiler would have two modes, one for "I need to parse this, and if it breaks the whole operation will fail" and "I'll try to parse this, and if it fails I should fail softly so that other choices can be considered." Because of this, I called the latter mode "soft mode", and the former... "hard... mode...?" That's super difficult to describe. Eventually I noticed a pattern, where soft mode was only going to be on until a "decision point" where we suddenly know for a fact that we are sticking with this path. So I abstracted the whole soft/hard thing behind a "definite" flag to place on one of the symbols in a production to indicate that it is that "decision point".

And it worked! I reimplemented the whole parser using this new generic framework. Eventually I was able to convert from a class to a ton of parse functions that passed around a few flags and values to control the current parser state. I made the internal logic more well defined by specifying several "modes" that the parser could be in depending on what kind of thing it was trying to parse.

But it didn't *really* work. It turns out my testing was insufficient. The problem that I was running into was a classic mutation problem. The parser state was fully mutable, so when state changed low in the call stack and then had to return, there was no graceful way to rewind and pick up where we left off. The solution ended up being to make the whole tokenizer and other parser state immutable. More refactoring ensued.

Then, once everything was done, I was able to finish the syntax for generics, and start implementing type checking for generics! Yea... turns out generics are complicated... I went through several months of nonsense trying to figure all that out, and getting discouraged again. Eventually, I needed a distraction, so I converted the whole project to TypeScript (that's right, everything before this point was in vanilla JS)! The TypeScript migration was one giant commit that touched basically the whole project.

This had far-reaching impacts to the parser and the syntax types. I had a convoluted definition structure for each non-terminal that now had to be strongly typed. I found a way to basically do it. The difficult piece was the syntax. Remember the whole concept of "reducing" to make nodes simpler for type checking? I was reusing the same type for both the non-reduced and reduced nodes. That wasn't going to work anymore, so I had to split all the syntax types into two categories of syntax: CST (concrete syntax tree, for the parser output), and AST (abstract syntax tree, for the type checker). So now every syntax type needed two classes...

Needless to say, this sucked. But I decided to put up with it for now. At that point, I could finish generic types. Which I did! However, then I noticed that the syntax nodes shouldn't have a ton of non-syntax logic inside them, so I converted all that to use visitors instead. Suddenly I had visitors everywhere! But now the logic wasn't mixed up all over the place, so I could be a bit happier.

#### The Second Refactor: Consolidation of Syntax Using Decorators

It was at this point that I went through a massive era of dissatisfaction with how the parser and syntax nodes worked. I did all refactoring under the sun. I split each syntax type up into several small pieces, then recombined them. I came out of this entire era with a system that I *kind of* liked, but as with most things, I thought it was the best thing since sliced bread. It was based on *decorators* on a *single node class* for each syntax type. Now I could have the grammar, reduction logic, and resulting AST structure in a single file! But even though 
