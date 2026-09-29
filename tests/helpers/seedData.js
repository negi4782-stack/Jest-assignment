const fs = require('fs');
const path = require('path');

// Written by tests/setup/globalSetup.js before any test runs
module.exports = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '.seed.json'), 'utf8')
);
