const express = require('express')
const app = express.Router()
const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
app.post('/deploy-build', (req, res, next) => {
    if (req.headers['authorization'] !== process.env.UPLOADAUTH) {
        res.status(401).send('Unauthorized')
    } else {
        next()
    }
}, (req, res, next) => {
    let zipPath = './app.zip'
    let stream = fs.createWriteStream(zipPath)
    stream.on('finish', () => {
        let tempPath = path.join(__dirname, '/tempBuild')
        let appPath = process.env.STATIC || './static'
        if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath)
        extract(zipPath, {dir: tempPath}).then(r => {
            fs.unlinkSync(zipPath)
            if (fs.existsSync(appPath)) fs.rmdirSync(appPath, {recursive: true})
            fs.renameSync(tempPath, appPath)
            res.status(200).json({error: false})
          }).catch(e => {
            fs.unlinkSync(zipPath)
            if (fs.existsSync(tempPath)) fs.rmdirSync(tempPath, {recursive: true})
            console.log(e)
            res.status(500).json({error: true})
        })
    })
    req.pipe(stream)
})
module.exports = app