import { CoreObject, FileRange } from '~/core';
import { Token } from '~/parser/lexer';
import { range } from '~/utils/utils';


export class PureForward extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly starLocation: FileRange
    ) { super() }
}

export type Dependency = ImportedName | ImportedNamespace | ForwardedName | PureForwardReplacement | ForwardedNamespace | ExportedName;

export class ImportedName extends CoreObject {
    constructor(
        readonly importNamespace: number,
        readonly importName: Token,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly exportName: Token
    ) { super() }
}

export class ImportedNamespace extends CoreObject {
    constructor(
        readonly importNamespace: number,
        readonly importName: Token,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly starLocation: FileRange
    ) { super() }
}

export class ForwardedName extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly forwardName: Token,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly exportName: Token
    ) { super() }
}

/**
 * Pure forwards are processed and replaced with adhoc forwarded names,
 * but because they aren't explicit they don't have the same structure as ForwardedNames.
 * The forwarded name itself is pulled from the export module's exports,
 * and any errors will be applied to the star location from the original pure forward.
 */
export class PureForwardReplacement extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly forwardName: string,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly starLocation: FileRange
    ) { super() }
}

export class ForwardedNamespace extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly forwardName: Token,
        readonly exportModule: string,
        readonly exportModuleLocation: FileRange,
        readonly starLocation: FileRange
    ) { super() }
}

export class ExportedName extends CoreObject {
    constructor(
        readonly namespace: number,
        readonly localName: Token,
        readonly exportName: Token
    ) { super() }
}

export class PureForwardGraph extends CoreObject {
    readonly edgeGrid: ReadonlyArray<ReadonlyArray<Optional<PureForward>>>;

    constructor(readonly size: number) {
        super();
        this.edgeGrid = range(size).map(_ => range(size).map(_ => null));
    }

    getForward(exporter: number, forwarder: number): Optional<PureForward> {
        return this.edgeGrid[exporter][forwarder];
    }

    addForward(exporter: number, forwarder: number, fwd: PureForward): PureForwardGraph {
        return this.mutate('edgeGrid', _ => _.mutate(exporter, _1 => _1.iset(forwarder, fwd)));
    }

    /**
     * Get all namespaces which forward from this one
     */
    getConsumers(exporter: number): ReadonlyArray<number> {
        const targets = this.edgeGrid[exporter];
        return range(this.size).filter(_ => !!targets[_]);
    }

    /**
     * Get all namespaces that this one has a forward for
     */
    getSuppliers(forwarder: number): ReadonlyArray<number> {
        return range(this.size).filter(_ => !!this.edgeGrid[_][forwarder]);
    }

    /**
     * Determines the pure forward cycles in this graph.
     * No node will appear in more than one cycle;
     * any cycles that intersect will be merged into one "aggregate" cycle.
     */
    getCycles(): ReadonlyMap<number, ReadonlySet<number>> {
        // initialize lists
        const cycles: ReadonlyArray<ReadonlySet<number>> = [];
        const visited: ReadonlyArray<boolean> = [];
        const currentPath: ReadonlyArray<number> = [];
        // visit
        const [finishedCycles] = this.cyclesVisitor(0, currentPath, visited, cycles);
        // assemble map
        const entries: Array<[number, ReadonlySet<number>]> = [];
        for (const cycle of finishedCycles) {
            for (const ns of cycle) {
                entries.push([ns, cycle]);
            }
        }
        return new Map(entries);
    }

    /**
     * Performs a recursive aggregate cycles algorithm for a given namespace, current recursion path,
     * set of visited namespaces, and current set of cycles.
     * 
     * For each consumer of the namespace, check to see if it exists in the current recursion path.
     * If it does, the path between the two namespaces either needs to be merged into an existing cycle
     * or added as a new cycle.
     * This is a depth-first search algorithm.
     * Once every consumer of the namespace is visited, the namespace is marked visited and the algorithm will
     * ascend back to the previous namespace.
     * If there are no namespaces left in the chain, the algorithm moves to the next namespace in the graph and starts
     * a new chain.
     * The algorithm is finished once every namespace in the graph has been visited, either by recursion from
     * an existing namespace or by iteration.
     */
    private cyclesVisitor(ns: number, currentPath: ReadonlyArray<number>, visited: ReadonlyArray<boolean>, cycles: ReadonlyArray<ReadonlySet<number>>): [ReadonlyArray<ReadonlySet<number>>, ReadonlyArray<boolean>] {
        // break recursion if we're out of namespaces or the namespace has already been visited
        if (ns >= this.size || visited[ns]) return [cycles, visited];

        const nextPath = [...currentPath, ns];
        let nextCycles = cycles;
        let nextVisited = visited;
        for (const consumer of this.getConsumers(ns)) {
            if (consumer === ns) {
                // TODO: figure out how to get diagnostics here (possibly just add another method to check for this)
                // for posterity: if this is true, the namespace has a pure forward to itself, which should just be a warning
            } else if (nextPath.includes(consumer)) {
                // we have a cycle, gather all namespaces in the path
                const cycle = nextPath.slice(nextPath.indexOf(consumer));
                // check to see if there is an existing cycle containing ANY of them
                const index = nextCycles.findIndex(_ => cycle.some(_1 => _.has(_1)));
                if (index > -1) {
                    // existing cycle, merge all of these into it
                    nextCycles = nextCycles.mutate(index, _ => cycles[index].union(cycle))
                } else {
                    // no existing cycle, add one
                    nextCycles = [...nextCycles, new Set(cycle)];
                }
            } else {
                // no cycle, recurse to consumer
                [nextCycles, nextVisited] = this.cyclesVisitor(consumer, nextPath, nextVisited, nextCycles);
            }
        }
        // namespace is now visited
        nextVisited = nextVisited.iset(ns, true);
        if (currentPath.length > 0) {
            // ascend back up to the parent because it may have more namespace to traverse
            return [nextCycles, nextVisited];
        } else {
            // starting namespace in the path is finished, increment namespace number and recurse
            return this.cyclesVisitor(ns + 1, currentPath, nextVisited, nextCycles);
        }
    }
}