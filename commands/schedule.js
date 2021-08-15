const { MessageCollector } = require('discord.js')


module.exports = {
    aliases: ['sc'],
    requiredPermissions: ['ADMINISTRATOR'],
    expectedArgs: "<channel> <yyyy-mm-ddThh:mm:ss+hh:mm> [role]",
    minArgs: 2,
    maxArgs: 3,
    init: () => {}, // todo
    callback: async ({ message, args }) => {
        const { mentions, guild, channel } = message

        const targetChannel = mentions.channels.first()
        if (!targetChannel) {
            message.reply('please include (tag) the channel you want the message to be sent in');
            return;
        }

        args.shift() // remove first arg (done with channel)

        const scheduledInstant = Date.parse(args[0]);
        if (!scheduledInstant) {
            message.reply('invalid date/time format – please follow the formats below:' +
                "\n• yyyy-mm-ddThh:mm:ss+HH:MM (date, literal character 'T', time, +/- timezone offset from GMT)" +
                "\n• yyyy-mm-ddThh:mm:ssZ (date, literal character 'T', time, literal 'Z' indicates GMT)");
        }

        // todo: handle role

        // gather scheduled message content
        // only process subsequent messages from original author
        const messageFilter = (incomingMessage) => {
            return incomingMessage.author.id === message.author.id
        }

        message.reply("what would you like the message to say?:")

        // listen for message, only 1 message (from orig author), 1 minute window
        const collector = new MessageCollector(channel, messageFilter, {
            max: 1,
            time: 6000
        })

        // once done or timeout, process
        collector.on('end', async (collected) => {
            const collectedMessage = collected.first();
            if (!collectedMessage) {
                message.reply("no message received! please start again")
                return
            }

            // todo: save to db

            message.reply("message scheduled")
        })

    }
}