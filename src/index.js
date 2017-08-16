import { readFileSync as readFile } from 'fs';
import { resolve } from 'path';

import parse from './parser';
import typecheck from './typecheck';
import translate from './translator';
import interpret from './interpreter';


// read contents of specified file
const path = resolve(process.argv[2]);
const contents = readFile(path).toString();
// parse them
const parsed = parse(contents);
// type check the parsed result
const checked = typecheck(parsed, path);
// translate the type checker result to IR
const translated = translate(checked);
// execute the IR in the interpreter and get the result of the program
const result = interpret(translated, process.argv.slice(3));
// write the result to stdout
process.stdout.write(result);
