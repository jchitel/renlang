# renlang Compiler

This is documentation related **strictly** to this TypeScript implementation of the renlang compiler.

As it has grown, it has become annoying to have to read through the code to rediscover the rationale behind decisions made in the implementation, as well as just how the implementation works. This documentation is to make that smoother for myself and for others who may find themselves in here one day.

## 100,000 Foot View

This is a short description of the principles that drive this implementation.

This compiler is designed to be as simple as possible, following the Ren semantics as to what programs are. There are a few core principles for the implementation:

* The compiler must be **100% pure functional**. This means:
  * Everything is immutable: *No changing the internal structure of objects after they are created; always use APIs that facilitate immutable transforms*. TypeScript's `readonly` keyword is key for making sure this happens.
  * All functionas must be *referentially transparent*, meaning that for a given input, the same output should always be returned.
  * *No side effects*. This means no modifying values external to the scope of a function from within the function. All that a function has access to within itself are its parameters, any local variables it creates, and any other *pure* functions it may want to call. Modifying local variables is fine as long as it is the reference that is changing, not the internal structure.
* There is one exception to the above rule: reading from and writing to files. All compilers must to this at some point during their operation, and this is inherently a side-effect operation. Files may not exist, there may be a fault with the operating system. However, the interface provided to deal with the file system must be as purely functional as possible.
* The 100% pure functional rule has far-reaching impact on the rest of the compiler. For example:
  * Classes can (and typically should) be used, but the rules of immutability are still enforced. To facilitate this, the compiler libraries provide a base class called `CoreObject` that exposes helpers for modifying fields in an immutable way.
  * Native data structures must use immutable interfaces:
    * Instead of using `Array<T>` or `T[]`, use `ReadonlyArray<T>`.
    * Instead of using `Map<T>`, use `ReadonlyMap<T>`.
    * Instead of using `Set<T>`, use `ReadonlySet<T>`.
    * Additionally, several other extensions to the above interfaces that provide helpful immutable operations.
* Everything must be strongly typed. No using `any` as a shortcut. And in fact, now that the `unknown` type exists, `any` should never be used. Consequences of this mean that some types can get very complex, but it pays off in maintainability and scalability. It also pushes us to write code in a way where it can be effectively typed.
* Organization is key. The src directory should be split up logically according to the various phases of the compiler. Common components belong in the top level (if they are considered "core" or "integral" to the project, e.g. classes/functions that are used in nearly every file, entry point functions, etc.) or a "utils" directory (if they are not extremely not "compiler-specific" components, e.g. small utility functions, new data structures, etc.).

The above core principles guide the high-level structure and decision-making of the project. When adding a new component or changing something, the addition must be:

1. Pure functional
2. Fit well into the type system
3. Go in the right place

## 10,000 Foot View

This is a slightly more detailed description of the high-level architecture of this implementation.

From the simplest point, the compiler is supposed to be thought of as a function:

```typescript
function compiler(sourceFilePath: string): Program { /* Do all the things */ }
```

A source file goes in, a compiled program comes out.

The internals of this get a bit hairier than this, however. That source file can declare dependencies on other source files, which may or may not exist; any of the resolved source files may not be of valid syntax; even if everything is parsable, the code itself may be semantically invalid; and then once everything is said and done, compiler doesn't actually spit a program back out to the user, it writes a compiled binary to the disk.

The high level architecture of the compiler is more like this:

```typescript
function compiler(sourceFilePath: string): void {
    const program = getProgram(sourceFilePath);
    writeFile('program', generateMachineCode(program));
}

function getProgram(sourceFilePath: string): Program { /* Parse the file, get all modules, typecheck the program */ }

function generateMachineCode(program: Program): Buffer { /* Take the code in the modules and create an executable */ }
```

But at the root of it all is that same concept. Start with a single file (the entry point of the program), and create an executable from it.

Looking at the code above, you see that we have two primary phases of the compiler:

1. Frontend: turn source code into syntax into a semantic program
2. Backend: turn a semantic program into an executable

This is true of effectively all compilers. There is typically one frontend, which turns program source code into some intermediate representation (IR), and several backends, each of which turns that IR into a system-specific binary.

### Frontend

The frontend of the compiler is responsible for 3 tasks:

1. [Parsing](./01-parser.md): turning source code into syntax
2. [Semantic analysis](./03-semantic.md): turning syntax into a semantic program, verifying the semantics of the program along the way
3. [Translation](./00-something.md): turning a semantic program into IR

### Backend

TBD

## The Top Level

This compiler was originally implemented as an interpreter, so most of the logic is set up to "run" the program instead of compiling it. This will change as we re-progress through the process. For now, I'll describe this in terms of the old functionality.

The entry point of this compiler is /src/index.ts. This bootstraps the environment, extracts the CLI arguments, passes the entry point file path into the runner, and exits the program with the emitted exit code from the program being run.

The runner consists of a single function: `runProgram`. This function:

1. Calls the typechecker to typecheck the program at the specified entry point path. This will internally parse and enumerate all source files of the program using the declared dependencies of each source file. It will then visit the entire program and make sure it is semantically correct, emitting errors and warnings along the way. The output of this function is a `Program` instance, which contains all modules, namespaces, and declarations of the program, as well as the full list of diagnostics.
2. Emits any errors and warnings to the console. If there were errors, it returns with an exit code of 1.
3. Calls the translator. This translates the semantic program into a list of executable instructions. This currently has no implementation, but there is a fully functional older implementation from a prior incarnation of this project.
4. Calls the interpreter with the resulting list of instructions and the CLI arguments, returning the result. This currently has no implementation, but there is a fully implemented (but not tested) interpreter from a prior incarnation of this project.

At this point, we've gotten granular enough that the other pages in this folder can provide additional details.
