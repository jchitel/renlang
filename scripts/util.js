const { resolve } = require('path');
const { execFileSync } = require('child_process');


let indent = 0;

function getIndent() {
    return '  '.repeat(indent);
}

/**
 * This will force require a script
 * so that it can be run more than once per script run.
 * The 'script' parameter is the name of a file in the
 * scripts/ directory, ignoring the extension.
 */
module.exports.run = function run(script) {
    console.log(`  ${getIndent()}Running script: "${script}"`);
    indent++;
    const path = resolve(process.cwd(), 'scripts', `${script}.js`);
    if (require.cache[path]) {
        delete require.cache[path];
    }
    require(path);
    indent--;
}

/**
 * This will run a command so that it runs "as you'd expect"
 * for a utility script, meaning that it pipes stdin/stdout
 * to this process's shell, and it executes with this process's
 * cwd.
 */
module.exports.exec = function exec(file, args = []) {
    console.log(`  ${getIndent()}Running external command: "${file} ${args.join(' ')}"`);
    execFileSync(file, args, { stdio: 'inherit', cwd: process.cwd() });
}
