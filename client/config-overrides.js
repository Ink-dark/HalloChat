const { override, addWebpackResolve } = require('customize-cra');

module.exports = override(
  addWebpackResolve({
    alias: {
      'path': require.resolve('path-browserify'),
      'fs': require.resolve('browserify-fs')
    }
  })
);