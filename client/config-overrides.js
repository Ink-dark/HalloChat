const { override, addWebpackResolve, overrideDevServer } = require('customize-cra');

module.exports = {
  webpack: override(
    addWebpackResolve({
      alias: {
        'path': require.resolve('path-browserify'),
        'fs': require.resolve('browserify-fs')
      },
      fallback: {
        'util': require.resolve('util'),
        'stream': require.resolve('stream-browserify')
      }
    })
  ),
  devServer: overrideDevServer({
    setupMiddlewares: (middlewares, devServer) => {
      return middlewares;
    }
  })
}