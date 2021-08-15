const {MessageCollector} = require('discord.js')
const dbconn = require('../db/dbconn')
const logHandler = require('../logs/logHandler');


module.exports = {
    aliases: ['sc'],
    // slash: true,
    requiredPermissions: ['ADMINISTRATOR'],
    expectedArgs: "<channel> <yyyy-mm-ddThh:mm:ss+hh:mm> [role]",
    minArgs: 2,
    maxArgs: 3,
    init: () => {
    }, // todo
    callback: async ({message, args}) => {
        const {mentions, guild, channel} = message

        // check and save channel to send message in
        const targetChannel = mentions.channels.first()
        if (!targetChannel) {
            message.reply('please include (tag) the channel you want the message to be sent in');
            return;
        }

        args.shift() // remove first arg (done with channel)

        // check and save scheduled date/time
        const scheduledInstant = new Date(args[0]);
        if (!scheduledInstant) {
            message.reply('invalid date/time format – please follow the formats below:' +
                "\n• yyyy-mm-ddThh:mm:ss+HH:MM (date, literal character 'T', time, +/- timezone offset from GMT)" +
                "\n• yyyy-mm-ddThh:mm:ssZ (date, literal character 'T', time, literal 'Z' indicates GMT)");
            return;
        }

        // check and save role to mention
        const mentionableRole = mentions.roles.first() ? mentions.roles.first() : null;
        logHandler.logMessage("role: " + mentionableRole, '**DEBUG**');


        // gather actual message content:
        message.reply("what would you like the message to say?:")

        // filter to only process subsequent messages from original author
        const messageFilter = (incomingMessage) => {
            return incomingMessage.author.id === message.author.id
        }

        // listen for message from original author
        const collector = new MessageCollector(channel, messageFilter, {
            max: 1,
            time: 1000 * 60 // 60 sec window
        })

        // once done or timeout, process
        collector.on('end', async (collected) => {
            const collectedMessage = collected.first();
            if (!collectedMessage) {
                message.reply("no message received! please start again")
                return;
            }

            // insert reminder into database, process success/error
            await dbconn.query("INSERT INTO reminders_bot__scheduled_reminders " +
                "(timestamp, content, userID, guildID, channelID, mentionableRoleID) " +
                "VALUES (CAST(? AS DATETIME),?,?,?,?,?)",
                [(scheduledInstant.toISOString().slice(0, -1)), collectedMessage.content, message.author.id, guild.id, targetChannel.id, mentionableRole.id]
                , function (err) {
                    if (err) {
                        logHandler.logMessage("DB INSERT query error: " + err, 'ERROR');
                        message.reply("sorry, an error occurred when trying to schedule message." +
                            "\nplease try again — if the problem persists please wait until bugs fixes are released!");
                        return;
                    }
                    message.reply("message scheduled!");
                    logHandler.logMessage("message scheduled", 'SUCCESS');
                });


        })

    }
}