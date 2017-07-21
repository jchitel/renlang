// noinspection JSUnresolvedVariable
/**
 * This file contains definitions of global variables so that Webstorm stops complaining.
 * We do want Webstorm inspections for actual problems, but we don't want to have to
 * disable them completely, or disable them partially with comments (as shown).
 * This file will never be imported or included in anything, and just serves to make the
 * development environment nice :).
 */

global.describe = () => {};
// noinspection JSUnresolvedVariable
global.it = () => {};

// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
function expect(...args) { // eslint-disable-line
    return {
        to: () => ({
            be: { true: {} },
        }),
    };
}
