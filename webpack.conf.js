const CONF = require('@ideadesignmedia/config.js')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CompressionPlugin = require("compression-webpack-plugin");
const fs = require('fs');
const path = require('path')
let build = path.join(process.cwd(), process.env.STATIC || './static')
let directory = path.join(process.cwd(), './src')
let inferredIndex = path.join(directory, 'index.html')
let htmlOptions = { title: process.env.TITLE || 'APP', hash: false, }
if (fs.existsSync(inferredIndex)) htmlOptions.template = inferredIndex
module.exports = {
    entry: process.env.ENTRY || './src/index.js',
    output: {
        path: build,
        filename: 'index.js',
    },
    module: {
        rules: [
            {
                test: /.(sa|sc|c)ss$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader",],
            },
        ],
    },
    plugins: [new HtmlWebpackPlugin(htmlOptions), new MiniCssExtractPlugin(), new CompressionPlugin()],
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
    devtool: "eval-cheap-source-map",
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
};