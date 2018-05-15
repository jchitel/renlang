import { EnumeratedModule, ModuleEnumerationStatus } from './enumeration';
import { DeclaredEntity, Namespace } from '../namespace';
import { Dependency, ImportedName, ImportedNamespace, ForwardedName, ForwardedNamespace, PureForward, ExportedName } from './dependencies';
import { CoreObject, Diagnostic } from '~/core';
import { LazyList, fromIterable } from '~/utils/lazy-list';


export interface DependencyResolutionOutput {
    readonly namespaces: ReadonlyArray<Namespace>;
    readonly diagnostics: ReadonlyArray<Diagnostic>;
}

export default function resolveDependencies(modules: ReadonlyMap<string, EnumeratedModule>, declarations: ReadonlyArray<DeclaredEntity>, namespaces: ReadonlyArray<Namespace>, dependencyQueue: ReadonlyArray<Dependency>) {
	return new ResolutionProcess(modules, declarations, namespaces, dependencyQueue).run();
}

/** The status of a given dependency, once resolution has begun */
enum DependencyStatus {
	/** Initial state, not yet determined whether the dependency is resolvable */
	Resolving = 1,
	/** Ideal state, the dependency has been resolved to a set of declaration ids */
	Resolved,
	/** The dependency target does not exist, needs to be tracked for posterity */
	Dangling,
	/** The dependency target depends on itself, and thus cannot ever be resolved */
	Circular
}

class ResolutionProcess extends CoreObject {
	readonly dependencyQueue: LazyList<Dependency>;
	/** namespace id -> name -> status */
	readonly localNameStatuses: ReadonlyMap<number, ReadonlyMap<string, DependencyStatus>> = new Map();
	/** namespace id -> name -> status */
	readonly exportNameStatuses: ReadonlyMap<number, ReadonlyMap<string, DependencyStatus>> = new Map();
	readonly diagnostics: ReadonlyArray<Diagnostic> = [];

	constructor(
		readonly modules: ReadonlyMap<string, EnumeratedModule>,
		readonly declarations: ReadonlyArray<DeclaredEntity>,
		readonly namespaces: ReadonlyArray<Namespace>,
		dependencyQueue: ReadonlyArray<Dependency>
	) {
		super();
		this.dependencyQueue = fromIterable(dependencyQueue);
	}

	/**
	 * The goal of this process is to populate the local and export names of every namespace in the program.
	 * All of the information required to do that is stored in the dependency queue, and all available
	 * modules and namespaces, including all available declarations within them, is stored in the
	 * corresponding registries.
	 * This process will simply consume the entire dependency queue, tracking the status of all dependencies
	 * until all of them are either resolved, dangling, or circular references.
	 */
	run(): DependencyResolutionOutput {
		const processed = this.consumeDependencyQueue();
		return processed.output();
	}

	consumeDependencyQueue(): ResolutionProcess {
		if (this.dependencyQueue.empty) return this;
		const { head, tail } = this.dependencyQueue;
		const next: ResolutionProcess = this.processDependency(head).clone({ dependencyQueue: tail });
		return next.consumeDependencyQueue();
	}

	processDependency(dependency: Dependency): ResolutionProcess {
		if (dependency instanceof ImportedName) return this.processImportedName(dependency);
		if (dependency instanceof ImportedNamespace) return this.processImportedNamespace(dependency);
		if (dependency instanceof ForwardedName) return this.processForwardedName(dependency);
		if (dependency instanceof ForwardedNamespace) return this.processForwardedNamespace(dependency);
		if (dependency instanceof PureForward) return this.processPureForward(dependency);
		if (dependency instanceof ExportedName) return this.processExportedName(dependency);
		return this.processExportedDeclaration(dependency);
	}

	processImportedName(dependency: ImportedName) {
		// if it's already been processed, we're done here
		if (this.isLocalNameDone(dependency.importNamespace, dependency.importName)) return this;
		// flag it as resolving for successive dependencies
		let next = this.setLocalNameStatus(dependency.importNamespace, dependency.importName, DependencyStatus.Resolving);
		const { module, status } = next.modules.get(dependency.exportModule)!;
		// make sure the module exists
		if (status !== ModuleEnumerationStatus.SUCCESS) {
			// module doesn't exist, the dependency is dangling
			return next.setLocalNameStatus(dependency.importNamespace, dependency.importName, DependencyStatus.Dangling);
		}
	}

	/**
	 * Determines if a local name has reached a terminal status.
	 */
	isLocalNameDone(namespaceId: number, name: string) {
		const ns = this.localNameStatuses.get(namespaceId);
		if (!ns) return false;
		const n = ns.get(name);
		if (!n) return false;
		return n !== DependencyStatus.Resolving;
	}

	setLocalNameStatus(namespaceId: number, name: string, status: DependencyStatus): ResolutionProcess {
		const ns = this.localNameStatuses.get(namespaceId) || new Map<string, DependencyStatus>();
		return this.clone({
			localNameStatuses: this.localNameStatuses.iset(namespaceId, ns.iset(name, status))
		});
	}

	output = (): DependencyResolutionOutput => ({
		namespaces: this.namespaces,
		diagnostics: this.diagnostics
	});
}