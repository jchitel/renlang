pub fn resolve_dependencies() {}

/*export interface DependencyResolutionOutput {
    readonly namespaces: ReadonlyArray<Namespace>;
    readonly diagnostics: ReadonlyArray<Diagnostic>;
}

/**
 * Using namespace dependencies added during the enumeration process,
 * populate the local and export references of all namespaces.
 */
export default function resolveDependencies(modules: ReadonlyMap<string, ModuleRef>, declarations: ReadonlyArray<Declaration>, namespaces: ReadonlyArray<Namespace>, pureForwards: ReadonlyArray<PureForward>) {
	return new ResolutionProcess(modules, declarations, namespaces, pureForwards).run();
}

class ResolutionProcess extends CoreObject {
	readonly diagnostics: ReadonlyArray<Diagnostic> = [];

	constructor(
		readonly modules: ReadonlyMap<string, ModuleRef>,
		readonly declarations: ReadonlyArray<Declaration>,
		readonly namespaces: ReadonlyArray<Namespace>,
		readonly pureForwards: ReadonlyArray<PureForward>
	) { super(); }

	/**
	 * The goal of this process is to populate the local and export names of every namespace in the program.
	 * All of the information required to do that is stored in the dependency info object,
	 * and all available modules and namespaces, including all available declarations within them,
	 * is stored in the corresponding registries.
	 * This process will simply consume all dependencies, tracking the status of all dependencies
	 * until all of them are either resolved, dangling, or circular references.
	 */
	run(): DependencyResolutionOutput {
		const next = this.processPureForwards();
		const processed = this.namespaces.reduce((p, _) => p.processNamespace(_.namespaceId), next);
		return processed.output();
	}

	/**
	 * Pure forwards make things quite complicated.
	 * We definitely want them because they allow for simple module aggregation.
	 * However, we have made the stipulation that if a dependency can theoretically be resolved,
	 * it should be resolvable in this language.
	 * Because cyclical pure forwards can technically be resolvable, we have to handle that case.
	 * What a cycle of pure forwards means is that all members of the cycle share the same pool of exports.
	 * 
	 * After MONTHS of deliberation, I have determined that the only way to effectively handle
	 * cyclical pure forwards is to handle pure forwards in their own step, because pure forwards
	 * are ultimately just replaced with normal named forwards.
	 * The reason this is so complicated is that in order to fully resolve pure forwards, we need to recurse
	 * down a potentially long, winding, and cyclical chain. I was unable to find a way to deal with that
	 * while at the same time handling the declaration bundling that comes with module dependencies.
	 * 
	 * The basic process for handling pure forwards is to arrange them into a graph, where each node is a namespace.
	 * From there, we can use the graph to detect any cycles in this graph.
	 * For namespaces that are not members of a cycle, we can evaluate their pure forwards by recursing
	 * until all dependent pure forwards have been replaced with normal forwards.
	 * For cycles, we can evaluate their pure forwards by determining all namespaces that "supply" the cycle,
	 * group all those exports together, and add each of those exports as exports of every cycle member.
	 * 
	 * Seems a whole hell of a lot more complicated than it should be, but that's where we're at.
	 */
	processPureForwards(): ResolutionProcess {
		let next = this;
		let graph = new PureForwardGraph(this.namespaces.length);
		// every forward is either an error or an edge in the graph
		for (const fwd of this.pureForwards) {
			const moduleRef = this.modules.get(fwd.exportModule)!;
			if (moduleRef.status !== ModuleStatus.SUCCESS) {
				// module was unresolved, add an error
				next = next.mutate('diagnostics', _ => [..._, new Diagnostic(`Module ${fwd.exportModule} could not be resolved`, fwd.exportModuleLocation)]);
			} else {
				// valid module, add the forward to the graph
				graph = graph.addForward(moduleRef.namespaceId, fwd.forwardNamespace, fwd);
			}
		}
		// visited array
		let visited: ReadonlyArray<boolean> = range(this.namespaces.length).map(() => false);
		// get them cycles
		const cycles = graph.getCycles();
		// iterate all namespaces
		for (const ns of range(this.namespaces.length)) {
			[next, visited] = next.replacePureForwards(ns, visited, graph, cycles);
		}
		return next;
	}

	replacePureForwards(ns: number, visited: ReadonlyArray<boolean>, graph: PureForwardGraph, cycles: ReadonlyMap<number, ReadonlySet<number>>): [this, ReadonlyArray<boolean>] {
		// avoid duplicate logic
		if (visited[ns]) return [this, visited];
		let next = this;
		// check if it is part of a cycle, because that changes everything
		const cycle = cycles.get(ns);
		if (cycle) {
			// get all suppliers of the cycle, including the members of the cycle
			const suppliers = cycle.union(cycle.flatMap(_ => graph.getSuppliers(_)));
			// iterate all suppliers, populating the aggregate list of exports
			let exports: ReadonlyArray<[number, string]> = []; // [namespace, export]
			for (const supplier of suppliers) {
				if (!cycle.has(supplier)) {
					// non-cyclic suppliers should be treated like normal: recurse to handle its suppliers
					[next, visited] = next.replacePureForwards(supplier, visited, graph, cycles);
				}
				// for all suppliers, add all of their exports to the list
				// for cycle members this means that only their own exports will be added
				exports = [...exports, ...[...next.namespaces[supplier].exports.keys()].map<[number, string]>(_ => [supplier, _])];
			}
			// now we have the full shared pool of cycle exports, so we can replace forwards for the cycle members
			for (const member of cycle) {
				const directSuppliers = graph.getSuppliers(member);
				// this is the default namespace to use as the supplier of a cyclic forward
				const firstForwardedMember = directSuppliers.filter(_ => cycle.has(_))[0];
				for (const [supplier, exp] of exports) {
					// determine what module to use for the forward:
					// 1. if the supplier is the module, ignore it
					if (member === supplier) continue;
					// 2. if the supplier has a forward in the module, use that
					// 3. otherwise, use the first forward from a member of the cycle (see above)
					const pure = graph.getForward(directSuppliers.includes(supplier) ? supplier : firstForwardedMember, member)!;
					const fwd = new PureForwardReplacement(member, exp, pure.exportModule, pure.exportModuleLocation, pure.starLocation);
					next = next.mutate('namespaces', _ => _.mutate(ns, _ => _.ensureExportTarget(exp, _ => _.addDependency(fwd))));
				}
				// mark the member visited because the whole cycle is handled here
				visited = visited.iset(member, true);
			}
		} else {
			// non-cyclical, we can just evaluate its suppliers
			for (const supplier of graph.getSuppliers(ns)) {
				[next, visited] = next.replacePureForwards(supplier, visited, graph, cycles);
				const pureFwd = graph.getForward(supplier, ns)!;
				// add a named forward for each of the supplier's exports
				for (const exp of next.namespaces[supplier].exports.keys()) {
					const fwd = new PureForwardReplacement(ns, exp, pureFwd.exportModule, pureFwd.exportModuleLocation, pureFwd.starLocation);
					next = next.mutate('namespaces', _ => _.mutate(ns, _ => _.ensureExportTarget(exp, _ => _.addDependency(fwd))));
				}
			}
		}
		// namespace is now visited
		return [next, visited.iset(ns, true)];
	}

	/**
	 * Given the id of a namespace, iterate all of its local and export name targets,
	 * processing all specified dependencies in each one.
	 * The returned namespace will be marked as fully resolved.
	 */
	processNamespace(nsid: number): ResolutionProcess {
		// process all exports (simple heuristic that is likely to process most locals in-line)
		const exports = [...this.namespaces[nsid].exports.keys()];
		let process = exports.reduce((p, _) => p.processExportName(nsid, _, []), this);
		// process all locals
		const locals = [...process.namespaces[nsid].locals.keys()];
		return locals.reduce((p, _) => p.processLocalName(nsid, _, []), process);
	}

	/**
	 * Given the id of a namespace and the name of one of its exports,
	 * fully resolve the export, processing all of its dependencies.
	 */
	processExportName(nsid: number, name: string, chain: ReadonlyArray<Dependency>): ResolutionProcess {
		// if we have reached a terminal state, then we're done already
		if (this.isExportNameDone(nsid, name)) return this;
		let process: ResolutionProcess = this;
		// process each dependency in the target
		while (process.getExport(nsid, name).dependencies.length) {
			// grab the first dependency
			const dep = process.getExport(nsid, name).dependencies[0];
			process = process.removeExportDependency(nsid, name, 0);
			// process the dependency
			process = process.processDependency(dep, chain);
		}
		// set the name target status to the aggregate status
		return process.mutateExport(nsid, name, _ => _.setAggregateStatus());
	}

	/**
	 * Given the id of a namespace and the name of one of its locals,
	 * fully resolve the local, processing all of its dependencies.
	 */
	processLocalName(nsid: number, name: string, chain: ReadonlyArray<Dependency>): ResolutionProcess {
		// if we have reached a terminal state, then we're done already
		if (this.isLocalNameDone(nsid, name)) return this;
		let process: ResolutionProcess = this;
		// process each dependency in the target
		while (process.getLocal(nsid, name).dependencies.length) {
			// grab the first dependency
			const dep = process.getLocal(nsid, name).dependencies[0];
			process = process.removeLocalDependency(nsid, name, 0);
			// process the dependency
			process = process.processDependency(dep, chain);
		}
		// set the name target status to the aggregate status
		return process.mutateLocal(nsid, name, _ => _.setAggregateStatus());
	}

	/**
	 * Given a dependency and the current dependency chain,
	 * process the dependency, resulting in the dependency being replaced by a corresponding reference.
	 * The basic process here is to:
	 * 1. Check if the dependency is in the current chain, meaning that it is circular, and the chain should stop.
	 * 2. Check if the target of the dependency exists, and if not, it's a dangling reference.
	 * 3. Recurse to the target of the dependency to fully resolve it.
	 * 4. Set a resolved reference if the target was resolved to at least one declaration.
	 * 5. Set an empty reference if the target was dangling.
	 * 6. Set a circular reference if the target was circular.
	 */
	processDependency(dependency: Dependency, chain: ReadonlyArray<Dependency>): ResolutionProcess {
		if (dependency instanceof ImportedName) return this.processImportedName(dependency, chain);
		if (dependency instanceof ImportedNamespace) return this.processImportedNamespace(dependency, chain);
		if (dependency instanceof ForwardedName) return this.processForwardedName(dependency, chain);
		if (dependency instanceof PureForwardReplacement) return this.processPureForwardReplacement(dependency, chain);
		if (dependency instanceof ForwardedNamespace) return this.processForwardedNamespace(dependency, chain);
		return this.processExportedName(dependency, chain);
	}

	/**
	 * Imported names result in remote local references to a specific export name.
	 * TODO: figure out if it is feasible to reduce duplicate logic across the different dependencies.
	 */
	processImportedName(dependency: ImportedName, chain: ReadonlyArray<Dependency>): ResolutionProcess {
		const { importNamespace, importName, exportModule, exportName, exportModuleLocation } = dependency;
		// circular check
		if (chain.includes(dependency))
			return this.addLocalReference(importNamespace, importName.image, new RemoteCircularReference(exportModule, exportName.image))
				// TODO: we should only add a diagnostic if all references are circular
				.addDiagnostic(`Dependency on export "${exportName.image}" from module "${exportModule}" is circular`, exportName.location);
		// dangling module check
		// TODO: need full path, not just the path of the dependency, should this be set by enumeration?
		const moduleRef = this.modules.get(exportModule);
		if (!moduleRef || moduleRef.status !== ModuleStatus.SUCCESS)
			return this.addLocalReference(importNamespace, importName.image, new MissingModule(exportModule, exportName.image))
				.addDiagnostic(`Module "${exportModule}" does not exist`, exportModuleLocation);
		const exportNamespace = moduleRef.namespaceId;
		// dangling export check
		if (!this.namespaces[exportNamespace].exports.has(exportName.image))
			return this.addLocalReference(importNamespace, importName.image, new MissingExport(exportModule, exportName.image))
				.addDiagnostic(`Module "${exportModule}" has no exported member "${exportName.image}"`, exportName.location);
		// export exists, traverse to it
		let process = this.processExportName(exportNamespace, exportName.image, [...chain, dependency]);
		// get the aggregate status
		const exp = process.getExport(exportNamespace, exportName.image);
		switch (exp.status) {
			case NameTargetStatus.FULLY_RESOLVED:
				// add a reference for each resolved reference of the target
				return exp.references.filter((_): _ is ResolvedReference => _.status === NameTargetStatus.FULLY_RESOLVED)
					.reduce((p, _) => p.addLocalReference(importNamespace, importName.image, new RemoteName(exportModule, exportName.image, _.resolvedDeclarationId)), process);
			case NameTargetStatus.DANGLING:
			case NameTargetStatus.EMPTY:
				return process.addLocalReference(importNamespace, importName.image, new RemoteEmptyReference(exportModule, exportName.image));
			case NameTargetStatus.CIRCULAR:
				return process.addLocalReference(importNamespace, importName.image, new RemoteCircularReference(exportModule, exportName.image));
			default:
				throw new Error('This isn\'t supposed to happen');
		}
	}

	/**
	 * Imported namespaces result in remote local references to a namespace.
	 * Interestingly enough, because we don't need to descend for these dependencies, it is impossible for them to be circular.
	 */
	processImportedNamespace(dependency: ImportedNamespace, chain: ReadonlyArray<Dependency>): ResolutionProcess {
		const { importNamespace, importName, exportModule, exportModuleLocation } = dependency;
		// dangling module check
		// TODO: need full path, not just the path of the dependency, should this be set by enumeration?
		const moduleRef = this.modules.get(exportModule);
		if (!moduleRef || moduleRef.status !== ModuleStatus.SUCCESS)
			return this.addLocalReference(importNamespace, importName.image, new MissingModule(exportModule, null))
				.addDiagnostic(`Module "${exportModule}" does not exist`, exportModuleLocation);
		// module exists, the dependency is immediately resolvabl
	}

	// #region Helpers

	isExportNameDone(nsid: number, name: string) {
		return this.getExport(nsid, name).status !== NameTargetStatus.NOT_RESOLVED;
	}

	isLocalNameDone(nsid: number, name: string) {
		return this.getLocal(nsid, name).status !== NameTargetStatus.NOT_RESOLVED;
	}

	getExport(nsid: number, name: string): NameTarget {
		return this.namespaces[nsid].exports.get(name)!;
	}

	getLocal(nsid: number, name: string): NameTarget {
		return this.namespaces[nsid].locals.get(name)!;
	}

	mutateExport(nsid: number, name: string, fn: (value: NameTarget) => NameTarget): ResolutionProcess {
		return this.mutate('namespaces', _ => _.mutate(nsid, _ => _.mutateExportTarget(name, fn)));
	}

	mutateLocal(nsid: number, name: string, fn: (value: NameTarget) => NameTarget) {
		return this.mutate('namespaces', _ => _.mutate(nsid, _ => _.mutateLocalTarget(name, fn)));
	}

	removeExportDependency(nsid: number, name: string, idx: number) {
		return this.mutateExport(nsid, name, _ => _.mutate('dependencies', _ => _.idelete(idx)));
	}

	removeLocalDependency(nsid: number, name: string, idx: number) {
		return this.mutateLocal(nsid, name, _ => _.mutate('dependencies', _ => _.idelete(idx)));
	}

	addExportReference(nsid: number, name: string, ref: Reference) {
		return this.mutateExport(nsid, name, _ => _.mutate('references', _ => [..._, ref]));
	}

	addLocalReference(nsid: number, name: string, ref: Reference) {
		return this.mutateLocal(nsid, name, _ => _.mutate('references', _ => [..._, ref]));
	}

	addDiagnostic(message: string, location: FileRange, level = DiagnosticLevel.Error): ResolutionProcess {
		return this.mutate('diagnostics', _ => [..._, new Diagnostic(message, location, level)]);
	}

	// #endregion

	output = (): DependencyResolutionOutput => ({
		namespaces: this.namespaces,
		diagnostics: this.diagnostics
	});
}*/