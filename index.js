require('@ideadesignmedia/config.js');
require('@ideadesignmedia/webserver.js')({ static: process.env.STATIC, port: process.env.PORT || 3333 }, require('./receive-build'));