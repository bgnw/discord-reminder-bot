const config = require('../config.json');
const mysql = require('mysql');
const logHandler = require('../logs/logHandler');

const dbConn = mysql.createConnection({
    host: config.MYSQL_HOST,
    database: config.MYSQL_DATABASE,
    user: config.MYSQL_USERNAME,
    password: config.MYSQL_PASSWORD
});

dbConn.connect(function (err) {
    if (err) {
        logHandler.logMessage("DB connection error: " + err, 'ERROR');
    } else {
        logHandler.logMessage("DB connected", 'SUCCESS');
    }
});

module.exports = dbConn;