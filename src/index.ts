/** Allows us to use require path aliases (~, ~test) */
import './require-hook';
/** Injects extensions into built-in APIs */
import './extensions';


import { resolve } from 'path';
import { runProgram } from './runner';


// extract the program path and arguments
const [path, ...args] = process.argv.slice(2);

// run the program
const exitCode = runProgram(resolve(process.cwd(), path), args);

// exit the process
process.exit(exitCode);
