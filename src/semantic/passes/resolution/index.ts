import { CoreObject } from '~/core';


export type Dependency = ImportedName | ImportedNamespace | ForwardedName | ForwardedNamespace | PureForward | ExportedName | ExportedDeclaration;

export class ImportedName extends CoreObject {
    constructor(
        readonly importModule: string,
        readonly importName: string,
        readonly exportModule: string,
        readonly exportName: string
    ) { super() }
}

export class ImportedNamespace extends CoreObject {
    constructor(
        readonly importModule: string,
        readonly importName: string,
        readonly exportModule: string
    ) { super() }
}

export class ForwardedName extends CoreObject {
    constructor(
        readonly forwardModule: string,
        readonly forwardName: string,
        readonly exportModule: string,
        readonly exportName: string
    ) { super() }
}

export class ForwardedNamespace extends CoreObject {
    constructor(
        readonly forwardModule: string,
        readonly forwardName: string,
        readonly exportModule: string
    ) { super() }
}

export class PureForward extends CoreObject {
    constructor(
        readonly forwardModule: string,
        readonly exportModule: string
    ) { super() }
}

export class ExportedName extends CoreObject {
    constructor(
        readonly module: string,
        readonly localName: string,
        readonly exportName: string
    ) { super() }
}

export class ExportedDeclaration extends CoreObject {
    constructor(
        readonly module: string,
        readonly declarationId: number,
        readonly exportName: string
    ) { super() }
}
