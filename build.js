const webpack = require('webpack')
const webpackConfig = require('./webpack.conf.js')

/* build out the src folder into a folder called static and an index.html with links to the compiled files. */
webpack(webpackConfig, (err, stats) => {
    if (err) {
        console.log(err.stack || err)
        if (err.details) {
            console.log(err.details)
        }
        return
    }
    const info = stats.toJson()
    if (stats.hasErrors()) {
        console.log(info.errors)
    }
    if (stats.hasWarnings()) {
        console.log(info.warnings)
    }
    console.log(stats.toString({
        chunks: false,
        colors: true
    }))
})