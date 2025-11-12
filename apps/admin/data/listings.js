const path = require('path');

const dataFile = path.join(__dirname, 'imported-listings.json');

// Load imported JSON listings into memory so the admin UI can review and edit before persistence.
// The array is mutated in-place to simulate storing changes for this demo app.
module.exports = require(dataFile);
