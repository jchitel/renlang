import { CoreObject } from '~/core';


export type Dependency = ImportedName | ImportedNamespace | ForwardedName | ForwardedNamespace | PureForward | ExportedName | ExportedDeclaration;

export class ImportedName extends CoreObject {
    constructor(
        readonly importNamespace: number,
        readonly importName: string,
        readonly exportModule: string,
        readonly exportName: string
    ) { super() }
}

export class ImportedNamespace extends CoreObject {
    constructor(
        readonly importNamespace: number,
        readonly importName: string,
        readonly exportModule: string
    ) { super() }
}

export class ForwardedName extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly forwardName: string,
        readonly exportModule: string,
        readonly exportName: string
    ) { super() }
}

export class ForwardedNamespace extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly forwardName: string,
        readonly exportModule: string
    ) { super() }
}

export class PureForward extends CoreObject {
    constructor(
        readonly forwardNamespace: number,
        readonly exportModule: string
    ) { super() }
}

export class ExportedName extends CoreObject {
    constructor(
        readonly namespace: number,
        readonly localName: string,
        readonly exportName: string
    ) { super() }
}

export class ExportedDeclaration extends CoreObject {
    constructor(
        readonly namespace: number,
        readonly declarationId: number,
        readonly exportName: string
    ) { super() }
}