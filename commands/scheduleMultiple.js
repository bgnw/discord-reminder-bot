const processReminderDetails = require('../functions/processReminderDetails');

module.exports = {
    aliases: [
        'rmult',
        'remult',
        'remindmult',
        'rmultiple',
        'remultiple',
        'remindmultiple',
        'scmult',
        'schedmult',
        'schedulemult',
        'scmultiple',
        'schedmultiple'
        // schedulemultiple (main command name)
    ],
    requiredPermissions: ['ADMINISTRATOR'],
    expectedArgs: "<channel> <date> <time> <timezone> [role]",
    minArgs: 4,
    maxArgs: 5,
    init: () => {
    },
    callback: async ({message, args}) =>
        processReminderDetails(message, args, 'MULTIPLE')
}
