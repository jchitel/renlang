export default class FunctionDeclaration {
    constructor(components) {
        Object.assign(this, components);
        this.functionName = this.functionNameToken.image;
    }
}
