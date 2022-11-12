const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./webpack.conf.js');

const compiler = Webpack({...webpackConfig, mode: 'development'});
const devServerOptions = { ...webpackConfig.devServer, open: true };
const server = new WebpackDevServer(devServerOptions, compiler);

const runServer = async () => {
  console.log('Starting server...');
  await server.start();
};

runServer();