const CONF = require('@ideadesignmedia/config.js')
const helpers = require('@ideadesignmedia/helpers')
const path = require('path')
const fs = require('fs')
helpers.zip(path.join(__dirname, process.env.STATIC || 'static'), path.join(__dirname, 'app.zip')).then(pathname => {
    helpers.upload(pathname, 'https://' + process.env.HOST + '/deploy-build', {authorization: process.env.UPLOADAUTH}, 'POST').then((r) => {
        console.log(r)
        fs.unlinkSync(path.join(__dirname, 'app.zip'))
    }).catch(e => {console.log(e); fs.unlinkSync(path.join(__dirname, 'app.zip'))})
}).catch(e => console.log(e))