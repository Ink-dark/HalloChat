module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 合并现有别名配置
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'path': require.resolve('path-browserify'),
        'fs': require.resolve('browserify-fs')
      };
      // 合并现有fallback配置
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        'util': require.resolve('util'),
        'stream': require.resolve('stream-browserify')
      };
      return webpackConfig;
    }
  }
};