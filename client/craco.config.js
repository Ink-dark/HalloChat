module.exports = {
  devServer: (devServerConfig, { env, paths }) => {
    // 确保devServerConfig存在
    if (!devServerConfig) {
      devServerConfig = {};
    }
    
    // 明确设置端口为3000
    devServerConfig.port = 3000;
    
    // 移除废弃的onBeforeSetupMiddleware和onAfterSetupMiddleware选项
    const beforeHandler = devServerConfig.onBeforeSetupMiddleware || devServerConfig.beforeSetupMiddleware;
    const afterHandler = devServerConfig.onAfterSetupMiddleware;
    
    // 清理废弃的选项
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.beforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;
    
    // 设置新的setupMiddlewares
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // 先执行before处理程序
      if (beforeHandler && typeof beforeHandler === 'function') {
        beforeHandler(devServer);
      }
      
      // 执行after处理程序（注意参数不同，webpack 5只需要devServer参数）
      if (afterHandler && typeof afterHandler === 'function') {
        afterHandler(devServer);
      }
      
      return middlewares;
    };
    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig) => {
      // Set publicPath to relative path for production
      webpackConfig.output.publicPath = process.env.NODE_ENV === 'production' ? './' : '/';
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