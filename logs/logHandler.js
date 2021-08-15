const colors = require('colors');

var logHandler = {
    logMessage: function(content, type) {

        const msg = (new Date()).toISOString() + " \| " + type.bold + " \| " + content;

        switch (type) {
            case 'ERROR':
                console.log(msg.red);
                break;
            case 'WARN':
                console.log(msg.yellow);
                break;
            case 'INFO':
                console.log(msg.blue);
                break;
            case 'SUCCESS':
                console.log(msg.green);
                break;
            case '**DEBUG**':
                console.log(msg.magenta);
                break;
            default:
                console.log(msg);
                break;
        }

    }
}

module.exports = logHandler;