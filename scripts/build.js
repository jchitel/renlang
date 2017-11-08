const { run, exec } = require('./util');


// clean the dist/ directory
run('clean');
// run typescript
exec('node_modules/.bin/tsc');
