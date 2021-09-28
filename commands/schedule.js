const processReminderDetails = require('../functions/processReminderDetails');

module.exports = {
    aliases: [
        'r',
        're',
        'remind',
        'sc',
        'sched'
        // schedule (main command name)
    ],
    requiredPermissions: ['ADMINISTRATOR'],
    expectedArgs: "<channel> <date> <time> <timezone> [role]",
    minArgs: 4,
    maxArgs: 5,
    init: () => {},
    callback: async ({message, args}) =>
        processReminderDetails(message, args, 'SINGLE')
}