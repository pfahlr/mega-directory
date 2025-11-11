const plugins = {};

try {
  // Loaded only when the dependency is installed locally.
  plugins.tailwindcss = require('tailwindcss');
} catch {
  // no-op
}

try {
  plugins.autoprefixer = require('autoprefixer');
} catch {
  // no-op
}

module.exports = {
  plugins,
};
