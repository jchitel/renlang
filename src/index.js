import { readFileSync } from 'fs';
import { resolve } from 'path';

import parse from './parser';
import translate from './translator';
import interpret from './interpreter';


// read contents of specified file
const contents = readFileSync(resolve(process.argv[2]));
// parse them
const parsed = parse(contents);
// translate the parse result to IR
const translated = translate(parsed);
// execute the IR in the interpreter and get the result of the program
const result = interpret(translated);
// write the result to stdout
process.stdout.write(result);
