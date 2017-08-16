# The Ren Programming Language (v0)

This is the documentation for version 0 of the Ren programming language, developed by Jake Chitel.
It describes the syntax, semantics, and runtime behavior of the language, as well as the goals of the language and a list of desired features for version 1.

## Introduction

Ren v0 (henceforth referred to as "v0") is an intermediate programming language designed for the sole purpose of getting from no Ren to Ren as quickly as possible.
In another manner of speaking, the purpose of v0 is to get to a self-hosted (a language that compiles itself) version of Ren using a minimal form of the desired language with a compiler written in some other language.
v0 is meant to be the bare minimum to allow us to build a compiler for v1 with as little non-Ren code as possible.

So in order to describe v0, the desired language of Ren must first be described.

### Ren

Ren is a (currently non-existent) language whose primary goal is to provide a succinct, yet expressive, language with syntactic and semantic features that allow it to be used for **any** possible application.
The name is an abbreviation of "Renaissance", as in "Renaissance man", or a person who is very good at many things.
It is also meant to come with "batteries included". Any tool that might be required in a Ren developer's stack is built into the compiler executable, including:

- a testing framework
- a debugger
- a code coverage analyzer
- a module system/package manager
- a profiler
- a build tool
- and potentially more...

At the same time, the language and toolset is meant to be extensible. All potential features should be included with the language, but not all developers' needs can be met, so one tool or language feature can be swapped out with another with ease.

So the core principles of Ren are:

- Succinctness
- Expressiveness
- Utility
- Low code overhead
- Low configuration overhead
- Batteries included
- Extensibility

From the side of the language itself, these goals are met with some opinionation. Mainly:

- The language is meant to be written in functional style, and includes features that allow programs to be written as purely functional. Functional programs are easy to reason about, and, when written correctly, can be far less verbose than their imperative counterparts.
- At the same time, pure functional programming can be an unnecessary burden for certain applications, so useful imperative features are included as well. A developer can build purely functional programs or more C-style imperative programs. The language strives to not make it difficult to use imperative style, as it can be more preferred in certain scenarios.
- The language utilizes strong typing, as it is proven to reduce bugs and lead to cleaner code.
- To reduce the burden that strong typing can introduce to languages, features are included that reduce overhead and allow the developer more freedom. Developers should not have to wrestle with the type system to get their code to work.
- The type system is based off of abstract data type (ADT) systems commonly found in pure functional languages, which provides a high level of simplicity and purity, and makes it much easier to write code in functional style.
- However, traditional object-oriented types such as classes and interfaces have their place, so these are included as well, and ADTs and OO types can play nicely together. A lot of this is adapted from the type system used by TypeScript.
- Wherever possible, language features should be added to reduce duplication and overhead in code. When looking at a function, the logic should be immediately apparent and not cluttered with code whose only purpose is preparing for the actual logic.
- The code should be easy to read, so the language makes use of delimiters such as commas, braces, and parentheses to define scope. Semicolons are not required, and instead are used when separating statements and declarations on the same line.

### v0

With the above in mind, v0 is a minimal subset (loosely, some features of v0 will be scrapped in v1) of the ideal Ren, which includes several simple features that will be core to Ren:

- Modules: items must be exported from a file (module) to be usable in other files, and those files must import these items to use them. This forms a two-way coupling that makes it very easy to trace module dependencies.
- Functions: all actual logic exists in functions, which can be either expression-bodied or statement-bodied. Functions can declare local variables and call out to other functions in their scope. Many types of expressions and statements are provided to aid in building logic.
- Types: the language comes with several built-in primitive types, from which other types can be built (struct types, tuple types, array types, function types). Type aliases can also be created.

As no version of Ren currently exists, another language must be used to create the first Ren compiler. The language chosen for this purpose is JavaScript, which provides several benefits, though the primary reason for its use is the preference of the developer. The benefits are:

- Easily bootstrapped dev stack (may be debatable).
- Dead simple module system (which actually provided inspiration for Ren's module system)
- Very succinct syntax
- Large standard library

Some drawbacks:

- Interpreted language which will always be slower than a compiled one
- Weak typing may introduce bugs

Only certain items need to be built in JS to be able to bootstrap a Ren compiler:

- tokenizer (lexer, splits input string into tokens)
- parser (analyzes token stream for syntactic correctness and organizes tokens into a syntax tree)
- type checker (analyzes syntax tree for semantic correctness and extracts type information of code)
- transformer (transforms resulting type-checked syntax tree into mid-level instructions)
- interpreter (executes instructions outputted from the transformer)
- standard library (library of base functions that provide logic that the language is not capable of executing)

A full compiler for v0 is not necessary because all that is needed is executability.

These are the steps in the lifecycle of v0, the conceptual product of each step's completion, and the current status of each step:

1. Implement tokenizer (lexical grammar) (DONE)
   - The tokenizer is structured similarly to a recursive descent parser. It has an order of lexical rules which it uses to consume characters, and sequences of consumed characters form valid tokens, which are objects containing information about the token such as the type, any parsed value it may have, and its position in the source code.
2. Implement parser (syntax) (DONE)
   - The parser is implemented as a recursive descent parser, where each production of the grammar is a function that consumes tokens to form AST nodes. Any invalid ordering of tokens results in an error. Each AST node includes its type and its child nodes, which may be other AST nodes or token objects. Later on, these AST node types will include logic for later steps.
3. Implement type checker (semantics) (DONE)
   - The type checker is implemented as a two-pass visitor. The first pass processes all declarations, organizing them into tables: imports, exports, types, functions, constants. The imports and exports tables are simply registries pointing to actual values. Imports point to a module/export-name combination, and each import causes a new module to be loaded, parsed, and processed, meaning that the first pass produces the list of modules that the program will contain. Exports point to the name of a local declaration. The types, functions, and constants tables are registries that point to AST nodes. Types represent type declarations, and functions and constants represent value declarations. Constants have no direct declaration form in the language, but exporting expression values will create a hidden constant. These may have a more direct form later. The second pass enumerates all declarations across all modules and resolves the type of all of them. Types are resolved by constructing the types as declared. The resolved type is then stored as a tag on the AST node. Functions are resolved by storing a type tag produced by the function signature, then resolving the body of the function and comparing the resulting type to the return type of the signature. This split process allows functions to be recursive. Constants are resolved by resolving their expressions. Whatever type the expression is resolved to is used as the type of the constant. The most common cases for errors are: 1) using an undefined name, 2) clashing names, 3) a type mismatch, where the actual type is not assignable to the expected type. The output of this step is the list of modules in the program.
4. Implement transformer (simple object-based instruction set) (DONE, NOT TESTED)
   - The primary goal here will be to flatten the AST into a series of instructions. The output will be the list of functions used in the program, so the concept of a module will be stripped away (though file/location information will be preserved). Here, we start with the main() function in the main module. If it does not exist, an error is thrown. This function is given an id of 0, and is placed in the 0 position of the function list. We do some bookkeeping instructions for the parameters, and then transform the function bodies. Any time an identifier is reached, it is transformed and added to the function list. Constants will be transformed as 0-arg functions that are memoized so they are only evaluated once. Types are no longer really needed at this step, they might be used for some things. Everything else (expressions and statements) will have a specific transformation function that converts itself to a series of simple instructions. The instructions themselves can be of varying complexity, but they should be as low level as possible. Basically anything that would be dealing with memory is just going to have to be offloaded to some object storage table. Everything else is just logic implemented via JS.
5. Implement interpreter (runtime behavior) (NOT STARTED)
   - The interpreter's job is to take the main function and start executing its instructions. For every other function call, it will place the current execution on a stack and start executing the new function. Once the main function is pulled off the stack, the return value is output as a success code. Any exceptions that are thrown will trigger a special stack popping sequence where a catch block matching the type of the exception will be searched for. Standard library function calls will hook into JS code that implements them.
6. Implement standard library (core standard library) (NOT STARTED)
   - This step will likely be started along with the type checker. We can't exactly type check until we know what types and functions are built into the language. The transformer also needs access to the standard library function calls, and the interpreter obviously needs the standard library logic so that it can execute it. This will effectively just be a directory full of modules for things like IO and binary operations and certain exception types, stuff that isn't possible directly in the language. Certain safety measures will likely have to be in place because it will be providing access to the underlying runtime. An interesting aspect of this is that even if we do make a self-hosting compiler, this logic will need to be a part of it. Once we start building the compiler we will need to reimplement these in assembly or somehow add them to v0's capabilities.
7. Write v0 compiler in v0 language (first real v0 source code) (NOT STARTED)
   - This will be a much larger endeavor. We will be reimplementing the existing logic from steps 1-4, and then introducing a completely new compiler backend, which will transform the IR output from step 4 into assembly. This will be the first real source code written in Ren, even though it will be v0. As was mentioned before, the standard library will need to be implemented some other way, either in Ren itself or in assembly.
8. Run v0 compiler on its own source code (first v0 executable) (NOT STARTED)
   - This is the official bootstrapping of the v0 language. Because all we have right now is an interpreter, the only thing we need to do is run the compiler source code directly. But the compiler is a program that requires input. We could run it with some test input (and probably will) but what better test than simply running the compiler source code on itself? The output will be an actual v0-written executable, which will actually be an exact logical copy of the source code itself. This executable will need to be saved (as well as the original JS interpreter source and the original v0 source used to build the executable), because it will provide the basis for all future compiler executables. Every new revision of the compiler must include the previous version, or we will lose the bootstrapping chain and have to start all over.
9. Build v0 compiler using v0 compiler (self-hosted v0 compiler) (NOT STARTED)
   - The previous step was more important, but now is for the ultimate test. Verifying that the compiled compiler compiles the compiler. We take our brand new executable and run it on the source code it was built from. The output should be the same (there may be reasons why it isn't), but if we then take that new-new compiler and run it, the output should be exactly the same as itself. We will now be officially self-hosted. From this point on, all introductions to the language need to be implemented and then compiled before they can be used. This will be the sequence of steps:
     - Conceptualize a language change (including lexical, syntactic, and semantic changes).
     - Add the conceptualized changes to the existing logic, using the previous language features.
     - Build a new compiler using the previous compiler. The new compiler will now be capable of compiling code that includes the language change.
     - Refactor the compiler source code to use the change (where applicable).
     - Compile again, so that now we get a compiler built both for and with the change, so it is a proof-of-concept of itself.

## Syntax

The syntax of v0 is relatively simple. A file containing v0 code can be called a program or a module. For our purposes we will call it a program.

### Program

A `Program` is the top-level component of a v0 program. It can contain any of four items:

- Import declarations
- Export declarations
- Function declarations
- Type declarations

The only restriction here is that import declarations must occur before any other types of declarations. This serves to separate the "prelude" of a module with the body of the module.

Additionally, every declaration must be separated by a new line. If you'd like to place declarations on the same line, you must separate them with a semicolon.

### Import declarations

Import declarations specify dependencies on other modules. They can be of the form:

```
import from "{module}": {ident}
import from "{module}" { {ident}, ... }
import from "{module}" { {ident} as {ident}, ... }
```

The first form is a "default import". Modules have two types of exports: an optional "default export" and 0 or more "named exports". The default export is there for the sake of simplicity, so that if a module only exports one value, it doesn't need to have a name. The first form of import explicitly imports the default export of another module. The `{module}` token is a path to a module to import. For details of what this can be, see the semantics section. The `{ident}` token is the local name you'd like to use for the value of the default import in *this* module. For example:

```
import from "io": IO
```

The above will take the default export of the "io" module and bind it to the name `IO` in this module. You can then access this value using that name.

The second and third forms are examples of how "named exports" can be imported. They are distinguished from default imports because they are surrounded by braces. Named exports are exported from modules with a specific name, and that name needs to appear in the import declaration. To import a named export and bind it to its own name as is, simply use the name and that's it. You can then access the value of the import using the same name it was exported with. If, for whatever reason, you need to use a different name, follow the export name with `as {ident}`, where `{ident}` is an "import alias". These work the same way as a default import. They allow you to assign your own name to an import value.

Named imports for one module can all appear in the same set of braces, with or without aliases, and each one must be separated by commas.

### Export declarations

Export declarations allow you to expose items from a module to be imported by other modules. They can be of the form:

```
export default {type-declaration|function-declaration|expression}
export {name} = {type-declaration|function-declaration|expression}
export {name}
```

The first form is a default export. If your module exports only one item, or there is one primary item to be associated with your module, use a default export. A default export can be a type declaration, a function declaration, or an expression. Type and function declarations have names that must be included in the declarations, but those names will not be exposed to other modules. (NOTE: see future improvements below)

The second form is an in-place named export. This works the same as a default export, but a custom name is bound to the item being exported. Again, whatever name is given to exported types and functions is not exposed, only the export name is exposed. Named exports can be used locally in the same module, even by other exported expressions. This is not the same thing as allowing top-level logic, though it is technically possible.

### Function declarations

Functions are the only place where logic can exist in code. They receive values as parameters and output a value as a return value. Functions can call other functions. Their bodies can be single expressions or statements that make use of the parameters provided to them.

```
func {returnType} {name}({paramType} {paramName}, ...) => {expression|statement}
```

To declare a function, use the `func` keyword followed by the return type of the function (in C/Java style), then the name of the function, then in parentheses all parameters of the function (you can specify none), then a fat arrow token (`=>`), then an expression or statement.

Parameters of a function must have the type of the parameter followed by the parameter name (in C/Java style), and are separated by commas. Functions are a clear contract point, so they should be fully and explicitly defined, including types.

The syntax for expressions and statements is described below.

### Type declarations

All type declarations are aliases for existing types, or types constructed from existing types. In Ren, types should be thought of as built rather than defined, because all types can exist without being explicitly defined (this will not be necessarily true in v1).

```
type {name} = {type}
```

To declare a type, use the `type` keyword followed by the name of the type, an equals sign, then some type. The syntax of types is described below.

Once a type is declared it can be used anywhere that types can be used, including other type declarations.

### Types

Types are tags that describe the structure or kind of data of a value. When they are used explicitly (according to the syntax of v0), they are used in function definitions to specify what values are allowed to be input into a function, and what values will be returned from the function. They are also used to define other types.

#### Primitives

v0 has several built-in primitive types, that is, types that are not made of any other types (with some exceptions):

- integer types: types that represent counting numbers from negative infinity to positive infinity. Integer types of every size have an unsigned and signed variant (denoted by a 'u' and 'i' respectively), and an alias for the more commonly used variety of the two.
  - 8-bit integers: u8, i8, byte (alias for u8)
  - 16-bit integers: u16, i16, short (alias for u16)
  - 32-bit integers: u32, i32, integer (alias for i32)
  - 64-bit integers: u64, i64, long (alias for i64)
  - int (unbounded integer type, behaves like all other integers but has a more complex implementation)
- floating point types: types that represent numbers with a fractional portion with limited precision, integer and fractional portion separated by a decimal point, optional exponential notation denoted by 'e'.
  - 32-bit floats: f32, float (alias for f32)
  - 64-bit floats: f64, double (alias for f64)
- character types: types that represent a single ascii or unicode character of varying width, denoted by a single character or code surrounded by single quotes.
  - char
- string types: types that represent a sequence of characters, effectively an alias for a character array, denoted by a sequence of 0 or more characters or codes surrounded by double quotes.
  - string
- boolean types: types that represent a value that can only be one of two values: true or false.
  - bool
- other types:
  - void: represents no value, an alias for the 0-tuple

#### Structured types

Structured types are more complex types that are composed of other types with some defined structure:

- tuples: tuples are groups of heterogeneous values. They can be of size 0 (empty tuple, a.k.a. void) or size 2 or more. The 1 tuple doesn't make sense because that is equivalent to the single value itself.
```
()
(int, char)
(int, char, bool)
```
- structs: structs are internally just like tuples, but each value is associated with a name called a key. They can be of any size.
```
{}
{ int a; char b }
{ int a; char b; bool c }
```
- arrays: arrays are variable-sized lists of homogeneous values. The type itself only indicates what type it can contain, not the size.
```
int[]
char[][]
```

#### Function types

Functions are first-class values in Ren, so they have types as well. The types of functions are determined by the return type, and the type and order of the parameters.
```
() => void
(int, int) => int
```

### Expressions

Expressions are syntactic constructs that represent an operation that will resolve to a single value with a type. Being a functional language, expressions are central to Ren. Most of your code will be expressions. Expressions have two primary categories: literals and operations.

#### Literals

Every built-in type has a literal form that is used to construct raw values of that type. Literals are expressions, but from a semantic standpoint, they are not computed. Their values are resolved at compile time.

- integer literals (1, -2, 100, 123456894, etc.)
- float literals (1.0, -4.2, 3.1415926, 10e100, etc.)
- character literals ('a', '\n', '\x00a0', etc.)
- string literals ("hello, world", "abcd", "", etc.)
- tuple literals ( (), (1, 'a'), (1, 'a', 2), etc. )
- struct literals ({ a: 1, b: 2, c: 3 }, etc.)
- array literals ([], [1,2,3], etc.)

Function literals are called lambda expressions, and they are a bit different because they contain logic. Lambda expressions are effectively the same as functions, but they don't have names, and references to them are created at runtime.

```
a => a + 1
(a, int b) => if (isInt(a)) a + b else b
```

Lambda expressions have inferred return types, and the parameters can be optionally inferred (no explicit type). This is because lambda expressions are usually passed as parameters to other functions, and functions have explicit parameter types, so it is often unnecessary to also include the types in the lambda expressions. In addition, because lambda expressions have no name, they do not represent a contract, so they do not require explicit types.

#### Operations

Operations are expressions that always must be computed at runtime (unless optimization is able to get around that).

- unary expressions: expressions that are composed of a single-parameter operator and an expression, in either order (a++, ~b, !2, etc.)
- binary expressions: expressions that are composed of a two-parameter operator and two expressions on either side of it (a+2, b-1, 2>1, etc.)
- if-else expressions: expressions that contain two sub-expressions and a condition expression that will choose the first if the condition is true, and the other if the condition is false (if (1<2) a else b)
- var declaration: expressions that allocate a variable and assign an expression as its value. variables are constant (a = 2)
- function application: expressions that take a target expression that will evaluate to a function and apply it with a list of arguments (println(a), sendMessage(mess, dest), (someFunc)(1, 2), etc.)
- field access: expressions that take a value from one of a struct's fields (a.b, myStruct.myField, etc.)
- array access: expressions that take a value from a specific index of an array or tuple (a[0], b[12], etc.)

### Statements

Statements are syntactic constructs that represent an operation that will perform some external operation (side effect), and will not resolve to a value. Statements are included in Ren to provide simple solutions to certain use cases that are tedious to solve with functional style. Statements fall within two general categories: loops and operations.

#### Loops

Loops are statements which contain a statement and some control mechanism which will control how many times the inner statement will be executed. They come in several flavors:

- for loops: for loops are a higher-level abstraction that iterate over each item in some iterable object, executing the loop body for each item (for (i of list) doSomething(i))
- while loops: while loops are simple loops that execute the body as long as some condition is true (while (i < 50) i++)
- do-while loops: do-while loops are a variation of while loops that will check the condition first after the first iteration of the loop (do i++ while (i < 50))
- break statements: these are not loops, but another loop control mechanism. executing a break inside a loop will exit the loop and end iteration. one can also specify an explicit loop number to allow breaking out of a specific containing loop in the case of nested loops (break, break 2, etc.)
- continue statements: similar to break statements, but they will simply end the current iteration and continue with the next iteration. explicit loop numbers are allowed here as well (continue, continue 2, etc.)

#### Operations

Operations are effectively "other" statements that aren't loops.

- expressions: that's right, expressions can be statements. in fact, most statements will be expressions. things like calling functions and assigning variables are important statements.
- blocks: blocks are brace-enclosed statements that can contain a list of statements to allow sequential execution of several statements ({}, {doThis();doThat()}, etc.)
- try-catch: try-catch statements are mechanisms for catching thrown errors in code. in the try block, if an exception is thrown matching the type of one of the catch blocks, that catch block will be executed (try doSomething() catch (int err) return err finally return 0)
- throw statements: throw statements are used to raise an error in the application. a thrown value will continue to rise up the call stack until it hits a matching catch in a try-catch (throw something)
- return statements: return statements are used to return a value from a statement-bodied function. once a return statement is hit, the function ends and returns to the caller. returns can also contain no value for the case of void functions (return, return 1)

## Semantics/Runtime

### Program execution

When a program is executed, one file is provided as an entry-point. That file must include a main() function of the form `func void main(string[] args) => {...}`. This main() function is the entry-point of the application. The runtime will parse command line arguments and pass them into the string array parameter of the function. if there are no command line arguments expected, this parameter can be omitted. The body can be either an expression or a statement, but a void value must be returned.

If a module being executed imports other modules, those modules are executed first so that their export values are exposed. This is repeated recursively until all modules are evaluated. The exported values used in the entry point module are kept in memory. Anything in any module that is not used is stripped away at compile time.

The runtime will start with the main() function and immediately begin executing the instructions inside it. Whenever another function call is encountered, the current stack frame is saved to a call stack, any passed parameters are applied, and execution will enter the function and begin executing those instructions. When a function is completed, its return value is extracted, the stack frame is popped off the stack, and execution returns to the calling function, where the return value is exposed to the caller if it is used. If main() returns, the program is terminated with a code of 0 (indicating success). The developer may preemptively terminate the program using the exit() function from the 'sys' module.

Expressions are evaluated left to right in most cases. If an expression's value is dependent on another's value, that expression is evaluated first. In the case of binary expressions, order of execution is determined by parentheses, precedence specifiers, and association specifiers. Any time parentheses are encountered, the expression within is evaluated, in all cases. If there are three expressions separated by two binary operators, the operator with the highest precedence is evaluated first, followed by the second. If they have the same precedence, the associativity is used. If the operator is left-associative, the expression is evaluated left-to-right. If right-associative, right-to-left.

If an error is thrown, stack frames are closed and peeled off the stack until there is a frame that has an active try block with a matching catch block for the error, in which case execution picks up in the catch block. If a try block has no matching catch block but does have a finally block, the finally block is executed before the stack frame is closed. If an error closes all stack frames all the way up to main, the error is "uncaught" and exposed via the stderr pipe, and the program is terminated with an error code of 1.

### Memory representation

All primitive types (except string and int) are implemented using 8, 16, 32, or 64-bit standard-width values, either integer or floating point. int is an unbounded integer. When it is below the bounds for the bounded integer types, it will use those types. Otherwise, it uses an array of 64-bit integers with custom operator implementations, expanding the array when overflows occur. string is implemented exactly as a character array.

Arrays are implemented as blocks of memory. If it contains primitives, those values are inlined into the array. Otherwise, each index is a reference to an item in the array.

Structs and tuples are either stack or heap allocated structures, depending how they are used. Just like arrays, primitives are inlined, while structured types are referenced.

Function references are simply pointers to memory locations in the text block of memory.

### Type system

The type system is very simple, and is based off of an ADT system where types are composed of our primitive types. Union types are not included (perhaps they should be). Primitive types of a smaller width are always assignable to those of the same or higher width, and structured types are assignable as long as the type assigning has all the fields of the type being assigned to. Arrays are assignable based on the rules of their containing types, and same with tuples, with the additional stipulation that the tuple types must have the same number of items in the same order. Function types are assignable such that more specific types can be assigned to more general parameter types, and more general types can be used for more specific return types. For example, `(int) => int` is assignable to `(long) => short` because an int is a valid long, and a short is a valid int.

When type checking, there are two primary focal points: function definitions and literals. The type checker starts with literals, because they are concrete values whose types will flow through the rest of the program. The types of literals are traced through all references where they are used. If a trace encounters a reference that has already been typed and the type does not match, an error is thrown. Once the type checking bubbles up to the top of a function definition, the types of parameters and the return type are checked against the traced types. If everything matches, the function type checks. Otherwise, an error occurs.

Before doing any of the actual type checking, all types loaded in the program must be resolved. This means that all type declarations are processed and all types that are referenced anywhere must be resolved against a declaration. Once that is done, a flow graph must be established connecting all references (variables and functions) to places they are used. Every node is visited, and a symbol table is used to store these connections. After this, we can begin visiting expressions until we arrive at primitive literals, and from there the type tracing happens as specified in the previous paragraph. Every expression is labelled with a type, and any unlabelled expression is visited to determine its type. Types need to be matched once they either reach a function call or reach the parameters or return types of the containing function.

## Future improvements

This is a list of improvements to be included in v1:

- Better imports and exports
  - `import from "module": * as all`: Star imports import all exported values from a module and group them into one namespace that you define.
  - `import from "module": MyDefault, {etc}`: You should be able to group the default import with other imports of the same module in one declaration.
  - `export default type = {type}`|`export default func {retType} () => {...}`: You should be able to declare types and functions as default exports without having to give them a name.
  - `export type {name} = {type}`|`export func {retType} {name}() => {...}`: You should be able to declare named type and function exports where the declaration name is used as the export name.
- Export forwarding
  - The below are all ways of exporting values from another module from your module as a way of aggregating modules. These are all possible today, but require multiple declarations and a lot of repetition.
  - `export from "module": ExportName`:                        Default from another -> Named from yours
  - `export default from "module"`:                            Default from another -> Default from yours
  - `export default from "module" { {name} }`:                 Named from another   -> Default from yours
  - `export from "module" { {name}, {name} as {alias}, ... }`: Named from another   -> Named from yours
  - `export default from "module": *`:                         All from another     -> Default from yours (grouped under a namespace object)
  - `export from "module": * as {name}`:                       All from another     -> Named from yours (grouped under a namepsace object)
  - `export from "module": *`:                                 All from another     -> All from yours (ungrouped, just a 1:1 forward)
- Destructuring
  - Allows extracting values from within structured values on the left side of an assignment as opposed to the right side, very clear and succinct syntax
- Pattern matching
  - An extension of destructuring that allows matching a value to one of several patterns and using that to choose a path
- Union types
  - Types that represent a union of two or more other types, where either can be used.