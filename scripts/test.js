const Mocha = require('mocha');
const { sync: glob } = require('glob');
const { resolve } = require('path');
const chai = require('chai');

const { run } = require('./util');
require('../dist/src/require-hook');
chai.use(require('chai-subset'));


run('build');

/**
 * Process pulled from mocha/bin/_mocha
 */
const mocha = new Mocha();
mocha.reporter('spec'); // default reporter
mocha.useColors(true); // we love colors!
mocha.ui('bdd'); // default ui
mocha.enableTimeouts(false); // disable timeouts cuz we be debuggin'
// add each file under generated test directory
glob('dist/test/**/*.js').map(f => resolve(f)).forEach(f => mocha.addFile(f));
// run, using the default process for exiting that mocha uses
mocha.run(code => process.on('exit', () => process.exit(Math.min(code, 255))));
