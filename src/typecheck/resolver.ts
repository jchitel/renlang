import { resolve, dirname, join } from 'path';
import { existsSync as exists, lstatSync as lstat } from 'fs';


/**
 * Given a path of a module imported into this module,
 * resolve the absolute path of that module.
 */
export default function resolveModule(from: string, path: string) {
    // if it is a relative path, resolve the relation and determine if it exists
    if (path.startsWith('.')) {
        const resolved = resolve(dirname(from), path);
        return resolveDirectPath(resolved);
    }
    // otherwise, it is a package import
    let dir = dirname(from);
    while (dir) {
        // we want to check the path '{currentModuleDir}/packages/{importPath}' for a valid module
        const resolved = resolveDirectPath(join(dir, 'packages', path));
        // valid path, use it
        if (resolved) return resolved;
        // if it didn't exist, we want to continue to check parent directories until we reach the fs root
        if (dir === dirname(dir)) break;
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
function resolveDirectPath(path: string) {
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
