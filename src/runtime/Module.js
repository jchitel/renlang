import { resolve, dirname, join } from 'path';
import { existsSync as exists, lstatSync as lstat, readFileSync as readFile } from 'fs';

import Parser from '../parser/Parser';


/**
 * Container class for a Ren module,
 * including all information required to identify and execute the module
 */
export default class Module {
    /**
     * Create a new module.
     * id: a number uniquely identifying the module in a given runtime environment
     * path: the absolute path of the module (this MUST be absolute, and it MUST correspond to an existing path)
     * ast: the parsed syntax tree of the code inside the module (if it is not provided, the file at the specified path will be parsed)
     */
    constructor(id, path, ast) {
        this.id = id;
        this.path = path;
        this.ast = ast || this.parseModule();
        // symbol tables
        this.imports = {};   // values imported from other modules
        this.exports = {};   // values exported from this module
        this.types = {};     // types declared in this module
        this.functions = {}; // functions declared in this module
        this.constants = {}; // constants declared in this module (only possible as part of an export, or an import of one from another module)
    }

    /**
     * Given a path of a module imported into this module,
     * resolve the absolute path of that module.
     */
    resolvePath(path) {
        // if it is a relative path, resolve the relation and determine if it exists
        if (path.startsWith('.')) {
            const resolved = resolve(this.path, path);
            return this._resolveDirectPath(resolved);
        }
        // otherwise, it is a package import
        let dir = dirname(this.path);
        while (dir) {
            // we want to check the path '{currentModuleDir}/packages/{importPath}' for a valid module
            const resolved = this._resolveDirectPath(path.join(dir, 'packages', path));
            // valid path, use it
            if (resolved) return resolved;
            // if it didn't exist, we want to continue to check parent directories until we reach the fs root
            if (dir === dirname(dir)) return null;
            dir = dirname(dir);
        }
        return null;
    }

    /**
     * Given an absolute path to an imported module (it may not exist),
     * follow the module system rules for module resolution
     * to determine the exact path to the module file, or return null
     * if it does not exist.
     */
    _resolveDirectPath(path) {
        // first check the direct path as-is
        if (exists(path)) {
            // check as if it is a directory
            if (exists(join(path, 'index.ren'))) return join(path, 'index.ren');
            // return the path as long as it's not a directory
            if (!lstat(path).isDirectory()) return path;
        }
        // then check it with a .ren extension
        if (exists(`${path}.ren`)) return `${path}.ren`;
        // doesn't exist according to the rules of the module system
        return null;
    }

    /**
     * If an AST wasn't passed to the constructor, it means this module is being loaded
     * during type checking. We need to parse the AST from the code ourselves if that is the
     * case. In addition, the type checker expects the AST to be reduced.
     */
    parseModule() {
        // read the file
        const contents = readFile(this.path).toString();
        // parse it
        const parsed = new Parser().parse(contents);
        // reduce it
        return parsed.reduce();
    }
}
