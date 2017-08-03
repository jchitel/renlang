export const MODULE_PATH_NOT_EXIST = (path) => `Module "${path}" does not exist`;
export const MODULE_DOESNT_EXPORT_NAME = (path, name) => `Module "${path}" does not have an export with name "${name}"`;
export const NAME_CLASH = (name) => `A value with name "${name}" is already declared`;
export const EXPORT_CLASH = (name) => `An export with name "${name}" is already declared`;
export const NOT_DEFINED = (name) => `Value "${name}" is not defined`;
