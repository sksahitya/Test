const CONF = require('@ideadesignmedia/config.js')
  const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
  const MiniCssExtractPlugin = require("mini-css-extract-plugin");
  const HtmlWebpackPlugin = require('html-webpack-plugin');
  const path = require('path')
  const fs = require('fs')
  const webpack = require('webpack')
  let build = path.join(process.cwd(), process.env.STATIC || './static')
  let directory = path.join(process.cwd(), './src')
  let inferredIndex = path.join(directory, 'index.html')
  let htmlOptions = {title: process.env.TITLE || 'APP', hash: false, }
  if (fs.existsSync(inferredIndex)) htmlOptions.template = inferredIndex
  function addNode(config) { 
      if (!config.resolve) config.resolve = {}
      const fallback = config.resolve.fallback || {}; 
      Object.assign(fallback, { 
        "crypto": require.resolve("crypto-browserify"), 
        "stream": require.resolve("stream-browserify"), 
        "assert": require.resolve("assert"), 
        "http": require.resolve("stream-http"), 
        "https": require.resolve("https-browserify"), 
        "os": require.resolve("os-browserify"), 
        "url": require.resolve("url"),
        "path": require.resolve("path-browserify")
        }) 
     config.resolve.fallback = fallback; 
     config.plugins = (config.plugins || []).concat([ 
       new webpack.ProvidePlugin({ 
        process: 'process/browser', 
        Buffer: ['buffer', 'Buffer'] 
      }) 
     ]) 
     return config;
    }
  module.exports =  addNode({
      entry: process.env.ENTRY || './src/index.js',
      output: {
          path: build,
          filename: 'index.js',
      },
      module: {
          rules: [
                  {
                      test: /\.(js|jsx)$/,    //kind of file extension this rule should look for and apply in test
                      exclude: /node_modules/, //folder to be excluded
                      use:  'babel-loader' //loader which we are going to use
                  },
              {
                  test: /.(sa|sc|c)ss$/i,
                  use: [MiniCssExtractPlugin.loader, "css-loader", ],
              },
          ],
      },
      plugins: [new HtmlWebpackPlugin(htmlOptions), new MiniCssExtractPlugin()],
      optimization: {
          minimizer: [
              new UglifyJsPlugin({
                  test: /\.js(\?.*)?$/i,
                  uglifyOptions: {
                      compress: true,
                      mangle: true,
                      extractComments: 'all',
                      parallel: false,
                      toplevel: true,
                  }
              })
          ],
      },
      devServer: {
        historyApiFallback: true,
          static: {
              directory,
              watch: {
                  ignored: '*.txt',
                  usePolling: false,
              }
          },
          compress: true,
          hot: true ,
          liveReload: true,
          port: process.env.DEVPORT || 3000,
          open: {
              target: ['index.html'],
              app: {
                  name: 'google-chrome',
                  arguments: ['--incognito', '--new-window'],
              },
          },
          webSocketServer: 'ws'
      },
      resolve: {
          extensions: ['.js','.jsx','.json'] 
      }
  });