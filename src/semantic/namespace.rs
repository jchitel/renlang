use std::path::{Path, PathBuf};
use std::collections::{hash_map::Entry, HashMap, VecDeque};
use crate::syntax;
use super::passes::dependencies::Dependency;


// #region Namespaces

/// A namespace is either a module or a declared namespace nested within another namespace.
pub enum Namespace {
    /// A namespace declared within another namespace.
    /// This contains its parent's namespace id, and the corresponding id and syntax
    /// of its declaration.
    Nested {
        namespace_id: usize,
        parent_namespace_id: usize,
        declaration_id: usize,
        // TODO: anonymous or regular
        node: syntax::NamespaceDeclaration,
        /// Contains all references for all names locally-scoped to the namespace
        locals: HashMap<&'static str, NameTarget>,
        /// Contains all references for all of this namespace's exported names
        exports: HashMap<&'static str, NameTarget>,
    },
    /// A module is a type of namespace, but has no parent, is not a declaration,
    /// and is alternatively identified by its file path.
    /// Other than that, it still has locals and exports just like any other namespace.
    /// Most namespaces in a program will be module namespaces.
    Module {
        namespace_id: usize,
        absolute_path: PathBuf,
        /// Contains all references for all names locally-scoped to the namespace
        locals: HashMap<&'static str, NameTarget>,
        /// Contains all references for all of this namespace's exported names
        exports: HashMap<&'static str, NameTarget>,
    }
}

impl Namespace {
    pub fn new_nested(
        namespace_id: usize,
        parent_namespace_id: usize,
        declaration_id: usize,
        node: syntax::NamespaceDeclaration
    ) -> Namespace {
        Namespace::Nested {
            namespace_id,
            parent_namespace_id,
            declaration_id,
            node,
            locals: HashMap::new(),
            exports: HashMap::new(),
        }
    }

    pub fn new_module(
        namespace_id: usize,
        absolute_path: PathBuf
    ) -> Namespace {
        Namespace::Module {
            namespace_id,
            absolute_path,
            locals: HashMap::new(),
            exports: HashMap::new(),
        }
    }

    fn locals(&mut self) -> &mut HashMap<&'static str, NameTarget> {
        use Namespace::*;

        match self {
            Nested { locals, .. } => locals,
            Module { locals, .. } => locals,
        }
    }

    fn exports(&mut self) -> &mut HashMap<&'static str, NameTarget> {
        use Namespace::*;

        match self {
            Nested { exports, .. } => exports,
            Module { exports, .. } => exports,
        }
    }

    // #region helpers

    /// Gets the NameTarget corresponding to a local.
    /// This will insert a new `NameTarget` if one was not present.
    /// Use `local_target_entry()` if this is not desired.
    pub fn get_local_target(&mut self, name: &'static str) -> &mut NameTarget {
        self.local_target_entry(name).or_insert_with(|| { NameTarget::new() })
    }

    /// Gets the NameTarget corresponding to an export.
    /// This will insert a new `NameTarget` if one was not present.
    /// Use `local_target_entry()` if this is not desired.
    pub fn get_export_target(&mut self, name: &'static str) -> &mut NameTarget {
        self.export_target_entry(name).or_insert_with(|| { NameTarget::new() })
    }

    /// Gets the map entry corresponding to a local.
    pub fn local_target_entry(&mut self, name: &'static str) -> Entry<&'static str, NameTarget> {
        self.locals().entry(name)
    }

    /// Gets the map entry corresponding to an export.
    pub fn export_target_entry(&mut self, name: &'static str) -> Entry<&'static str, NameTarget> {
        self.exports().entry(name)
    }

    // #endregion
    // #region local references

    pub fn add_imported_name(
        &mut self,
        name: String,
        module_path: &'static Path,
        export_name: String,
        declaration_id: usize
    ) {
        self.get_local_target(&name).add_reference(Reference::RemoteName {
            module_path,
            export_name,
            resolved_declaration_id: declaration_id
        });
    }

    pub fn add_imported_namespace(&mut self, name: String, module_path: &'static Path, declaration_id: usize) {
        self.get_local_target(&name).add_reference(Reference::RemoteNamespace {
            module_path,
            resolved_declaration_id: declaration_id
        });
    }

    pub fn add_local_declaration(&mut self, name: String, declaration_id: usize) {
        self.get_local_target(&name).add_reference(Reference::LocalDeclaration {
            resolved_declaration_id: declaration_id
        });
    }

    // #endregion
    // #region export references

    pub fn add_forwarded_name(&mut self, name: String, module_path: &'static Path, export_name: String, declaration_id: usize) {
        self.get_export_target(&name).add_reference(Reference::RemoteName {
            module_path,
            export_name,
            resolved_declaration_id: declaration_id
        });
    }

    pub fn add_exported_remote_namespace(&mut self, name: String, module_path: &'static Path, declaration_id: usize) {
        self.get_export_target(&name).add_reference(Reference::RemoteNamespace {
            module_path,
            resolved_declaration_id: declaration_id
        });
    }

    pub fn add_exported_name(&mut self, name: String, local: String, declaration_id: usize) {
        self.get_export_target(&name).add_reference(Reference::LocalName {
            name: local,
            resolved_declaration_id: declaration_id
        });
    }

    pub fn add_exported_declaration(&mut self, name: String, declaration_id: usize) {
        self.get_export_target(&name).add_reference(Reference::LocalDeclaration {
            resolved_declaration_id: declaration_id
        });
    }

    // #endregion
}

/// A ModuleRef is a reference to a module namespace.
/// It will either be successful (resolved), or not successful (either not yet resolved or unresolvable).
/// All successful module references will have a resolved namespace id.
pub enum ModuleRef {
    /// The initial state of any module that is referenced, including the entry. Nothing has been done with it yet.
    Referenced { fullyResolved: bool },
    /// The module was found, but failed to parse
    Unparsed { fullyResolved: bool },
    /// The module was not found
    NotFound { fullyResolved: bool },
    /// The module was found and parsed
    Success {
        namespaceId: usize,
        fullyResolved: bool,
    }
}

// #region NameTargets and References

/// Name targets in a program have to be quite complex for a number of reasons,
/// the primary ones being that:
/// - namespaces can circularly reference one another
/// - declaration merging (having a name resolve to multiple declarations) is valid
/// 
/// A namespace has two lists: a list of locals (locally-scoped names) and a list of
/// exports (externally-accessible names). These "lists" are mappings from a name
/// to a name target.
/// 
/// A name target, once everything is said and done, has simply a list of references.
/// 
/// A reference, once everything is said and done, can be one of 8 types, which are divided
/// into 3 categories:
/// - resolved references (references that correspond to a declaration id):
///   - remote name (a reference to an export of another module)
///   - remote namespace (a reference to the top-level namespace of a module)
///   - local name (a reference to some locally-scoped name)
///   - local declaration (a direct reference to a local declaration)
/// - dangling references (references whose targets do not exist)
///   - missing module (a reference to a non-existent module)
///   - missing export (a reference to a non-existent export of an existent module)
///   - missing local (a reference to a non-existent local)
/// - circular references (references that depend indirectly to themselves, which are a special type of dangling reference)
/// 
/// This structure forms a tree: namespace -(1:many)-> name -(1:1)-> name target -(1:many)-> reference
/// 
/// This makes sense at face value, but becomes complex when you envision what has to happen
/// during the process of resolving all of these names and references. The enumeration
/// process, whose job it is to enumerate and register all namespaces and declarations in the program,
/// will place only direct references (always local declarations) into name targets.
/// Everything else is registered as a dependency on each name target. Dependencies have one
/// type for each logical type of dependency (the various kinds of imports, exports, and forwards).
/// 
/// To manage the potential for circular references and declaration merging,
/// the concept of a "status" has to be introduced on all three levels of the namespace tree:
/// - name targets need an "aggregate status" so that any other name targets referencing them
///   know when they have all corresponding references fully resolved (even if they are unsuccessful)
/// - references have an implicit status. the three categories of references correspond to the three
///   terminal statuses: resolved, dangling, and circular. there is also a special intermediate reference
///   type called a "stub reference" that serves as a placeholder to indicate when a reference is in the
///   process of being resolved. this serves the purpose of preventing infinite recursion when dealing
///   with circular references.
pub struct NameTarget {
    status: NameTargetStatus,
    references: Vec<Reference>,
    dependencies: VecDeque<Dependency>,
}

impl NameTarget {
    pub fn new() -> NameTarget {
        NameTarget {
            status: NameTargetStatus::NotResolved,
            references: vec![],
            dependencies: VecDeque::new(),
        }
    }

    fn add_reference(&mut self, reference: Reference) {
        self.references.push(reference);
    }

    fn add_dependency(&mut self, dep: Dependency) {
        self.dependencies.push_back(dep);
    }

    fn pop_dependency(&mut self) -> Option<Dependency> {
        self.dependencies.pop_front()
    }

    fn set_aggregate_status(&mut self) {
        if self.references.iter().any(|r| { r.status() == NameTargetStatus::FullyResolved }) {
            self.status = NameTargetStatus::FullyResolved;
        } else if self.references.iter().any(|r| { r.status() == NameTargetStatus::Dangling }) {
            self.status = NameTargetStatus::Dangling;
        } else if self.references.iter().any(|r| { r.status() == NameTargetStatus::Circular }) {
            self.status = NameTargetStatus::Circular;
        } else {
            self.status = NameTargetStatus::Empty;
        }
    }
}

#[derive(PartialEq)]
pub enum NameTargetStatus {
    /// Not yet visited or currently being visited
    NotResolved = 1,
    /// Done being visited
    FullyResolved,
    /// No references could be resolved
    Dangling,
    /// All references are circular
    Circular,
    /// All references could be resolved, but none contain a declaration
    Empty,
}

pub enum Reference {
    /// A reference to an export name from another module.
    RemoteName {
        module_path: &'static Path,
        export_name: String,
        resolved_declaration_id: usize,
    },
    /// A pointer to a module's top-level namespace
    RemoteNamespace {
        module_path: &'static Path,
        resolved_declaration_id: usize,
    },
    /// A reference to a name that is scoped to the current module
    LocalName {
        name: String,
        resolved_declaration_id: usize,
    },
    /// A direct reference to a local declaration.
    LocalDeclaration {
        resolved_declaration_id: usize,
    },
    /// A reference to a module that doesn't exist.
    /// This applies for both named and wildcard imports/forwards.
    MissingModule {
        module_path: &'static Path,
        export_name: Option<String>,
    },
    /// A reference to a module's export where the module exists,
    /// but the export does not.
    /// This applies only for named imports/forwards.
    MissingExport {
        module_path: &'static Path,
        export_name: String,
    },
    /// A reference to a local that doesn't exist.
    /// This applies only to named exports.
    MissingLocal {
        local_name: String,
    },
    /// A remote reference whose dependency chain circles back on itself.
    /// This applies only to named imports/forwards.
    CircularRemote {
        module_path: &'static Path,
        export_name: String,
    },
    /// A local reference whose dependency chain circles back on itself.
    /// This applies only to named exports.
    CircularLocal {
        local_name: String,
    },
    /// This is a "chained" remote dangling or circular reference.
    /// The dependency could be resolved, but the end of the chain
    /// doesn't actually resolve to a declaration.
    EmptyRemote {
        module_path: &'static Path,
        export_name: String,
    },
    /// This is a "chained" local dangling or circular reference.
    /// The dependency could be resolved, but the end of the chain
    /// doesn't actually resolve to a declaration.
    EmptyLocal {
        local_name: String,
    }
}

impl Reference {
    fn status(&self) -> NameTargetStatus {
        use Reference::*;

        match self {
            RemoteName { .. } | RemoteNamespace { .. } | LocalName { .. } | LocalDeclaration { .. } => NameTargetStatus::FullyResolved,
            MissingModule { .. } | MissingExport { .. } | MissingLocal { .. } => NameTargetStatus::Dangling,
            CircularRemote { .. } | CircularLocal { .. } => NameTargetStatus::Circular,
            _ => NameTargetStatus::Empty
        }
    }
}

/// A semantic declaration is a node that is ultimately associated with a name
pub enum Declaration {
    /// A semantic function entity, identified by a name.
    Function {
        declaration_id: usize,
        // TODO: anonymous or regular
        node: syntax::FunctionDeclaration,
    },
    /// A semantic type entity, identified by a name.
    Type {
        declaration_id: usize,
        // TODO: anonymous or regular
        node: syntax::TypeDeclaration,
    },
    /// A semantic constant entity, identified by a name.
    Constant {
        declaration_id: usize,
        // TODO: anonymous or regular
        node: syntax::ConstantDeclaration,
    },
    Namespace {
        declaration_id: usize,
        namespace_id: usize,
    }
}
