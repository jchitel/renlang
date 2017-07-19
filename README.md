# renlang
The Ren Programming Language

## Goals

The goals of this language haven't been entirely solidified yet. As of now, the goals are:

- Strong, static type system
- Type inference
- Object-oriented
- Abstract data types (ADTs, including Monads, Functors, etc.)
- Optional pure functional logic
- Optional imperative logic
- Hybrid quasi-pure logic
- Function contexts (new concept based on several similar ideas)
- Async programming
- Generator functions
- Destructuring/Pattern matching
- Succinct data structure literals (lists, objects, maps, etc.)
- Clear delimitation (braces, commas, and semi-colons over whitespace/indentation)
- Easy low-level programming with raw types (types that provide a direct mapping to memory)
- Pointers (modelled after Rust)
- and much more

From a high level, this language strives to be practical by providing tons of syntax and features designed to make it easy to choose a solution for any given problem.

The language includes some opinionation, but anything should be possible. It should be able to be used for any of the following scenarios and more:

- Game development
- Web development
- Systems development
- Application development
- High-concurrency programming
- Scripting
- etc.

It also comes with a suite of development tools built-in:

- Package manager
- Build tool
- Test framework
- Profiling tools
- Debugging tools
- Code coverage tool
- Linting tool

The module system is heavily inspired by the ECMAScript module system, with a bunch of extra goodies added:

- All module dependencies are file-system-relative, i.e. a module import will search in the file's directory for that module, and then ascend upward to the root directory until it finds the desired module.
- A module file can be used to specify other relative files around it that it will export. This allows for encapsulation.
- Module importing is string-based, to promote the idea that you are simply specifying a relative path. A module's "name" is simply its path.
- Modules export named values, and an optional default value that will be imported when no name is specified.
- Importing a directory as a module will check an 'index.ren' file for export information.
- Modules control compiler settings for the code within them. These settings can also cover modules in sub-directories.

## Progress

This project is starting from scratch, and will build a full compiler using no external dependencies. This is the TODO list:

- [ ] Grammar
- [ ] AST logic
- [ ] Lexical grammar
- [ ] Lexer
- [ ] Parser
- [ ] Type checker
- [ ] IR code generator
- [ ] Runtime library
- [ ] Interpreter
- [ ] Self-hosting
- [ ] ...backend
- [ ] Fully self-hosting
- [ ] More backends
- [ ] Test framework/coverage tool
- [ ] Build system
- [ ] Debugger
- [ ] Profiler
- [ ] Linter
- [ ] Package manager

So the workflow is as so:

1. Come up with a formal grammar for the language.
2. Create a simple AST library.
3. Extract the lexical grammar from the formal grammar.
4. Write the lexer (component that splits a source code string into tokens).
5. Write the parser (component that converts a token sequence into an AST).
6. Write the type checker (component that verifies that the AST is valid according to specified types)
7. Write the IR code generator (component that spits out some simple middle-level language that can be easily executed)
8. Write the runtime library (library of basic functionality that can be used to create programs, e.g. IO, threads, string operations, CLI argument parsing, data structures)
9. Write an interpreter (a component that is capable of executing the IR for the time being, so that the next step works...)
10. Make the language self-hosting (rewrite all logic (except the interpreter) in the language, now that it can be executed)
11. Create the x86 backend (this will be split out into more steps, but I'm not sure what most of them are at the moment)
12. Make the language fully self-hosting, so that all logic (including the interpreter) is written in the language
13. Create more backends (more of a long-term process)
  - JS backend (for web apps, ren.js)
  - wasm backend (for web apps, ren.wasm)
  - JVM backend (jren)
  - LLVM backend
  - ARM backend
  - CLR backend (ren.net)
  - GCC backend (cren)
14. Build the test framework, convert tests to use it (a simpler one will have already been created prior)
15. Build the build system (component that provides a mechanism for building applications in Ren)
16. Build the debugger (component that allows halting and inspection of a program while it is running)
17. Build the profiler (component that provides detailed statistics of runtime performance)
18. Build the linter (component that allows developers to specify and enforce style rules)
19. Build the package manager (component that allows developers to publish packages for usage by other developers)
  - This will be interesting because it requires hosting. Luckily, we can probably just use Github to start out.
  - I can have a separate branch of renlang that contains a package registry, and developers can publish packages via pull requests.