import Module = require('module');


const req = Module.prototype.require;

/**
 * We make use of typescript's "paths" option to allow us to not
 * have to specify a bunch of ".." in module import paths.
 * Having a simple path such as "~" as the root of the src/ directory
 * looks much cleaner. However, typescript doesn't translate these
 * imports to the proper paths, so we still need a mechanism to
 * translate the imports at runtime.
 * 
 * This file should be imported for any code that will run a module
 * in this package. The src/index.ts file already imports it,
 * and the test command is configured to do so as well.
 */
Module.prototype.require = function(path: string, ...args: any[]) {
    let resolved = path;
    if (path.startsWith('~/')) {
        resolved = path.replace(/^~/, __dirname);
    } else if (path.startsWith('~test/')) {
        resolved = path.replace(/^~test/, `${__dirname}/../test`);
    }
    return req.call(this, resolved, ...args);
}
