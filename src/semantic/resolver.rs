use std::path::PathBuf;


/// Given a path of a module imported into this module,
/// resolve the absolute path of that module.
pub fn resolve_module(from: PathBuf, path: String) -> Option<PathBuf> {
    // if it is a relative path, resolve the relation and determine if it exists
    if path.starts_with('.') {
        let resolved = from.parent().unwrap().join(path);
        return resolve_direct_path(resolved);
    }
    // otherwise, it is a package import
    let dir = from.parent();
    while dir.is_some() {
        let dir = dir.unwrap();
        // we want to check the path '{currentModuleDir}/packages/{importPath}' for a valid module
        let resolved = resolve_direct_path(dir.join("packages").join(path));
        // valid path, use it
        if resolved.is_some() { return resolved; }
        // if it didn't exist, we want to continue to check parent directories until we reach the fs root
        let parent = dir.parent();
        if parent.is_none() { break; }
        dir = parent.unwrap();
    }
    return None;
}

/// Given an absolute path to an imported module (it may not exist),
/// follow the module system rules for module resolution
/// to determine the exact path to the module file, or return null
/// if it does not exist.
fn resolve_direct_path(path: PathBuf) -> Option<PathBuf> {
    // first check the direct path as-is
    if path.exists() {
        // check as if it is a directory
        let index = path.join("index.ren");
        if index.exists() { return Some(index); }
        // return the path as long as it's not a directory
        if !path.is_dir() { return Some(path); }
    }
    // then check it with a .ren extension
    let dot_ren = path.with_extension("ren");
    if dot_ren.exists() { return Some(dot_ren); }
    // doesn't exist according to the rules of the module system
    return None;
}
