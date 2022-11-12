const CONF = require('@ideadesignmedia/config.js')
const createServer = require('@ideadesignmedia/webserver.js')
var server
global.makeServer = () => { if (server) { server.close() } server = createServer({ static: process.env.STATIC, port: process.env.PORT || 3333 }, require('./receive-build')) }
global.makeServer()