const createReminder = require('./createReminder');
const logHandler = require('../logs/logHandler');
const {MessageCollector} = require('discord.js');
const moment = require("moment-timezone");


const timeUnitsToMs = {
    'm': 60000,
    'min': 60000,
    'minute': 60000,
    'h': 3600000,
    'hr': 3600000,
    'hour': 3600000,
    'd': 86400000,
    'day': 86400000
}

const humanUnits = {
    'm': 'minute',
    'h': 'hour',
    'd': 'day'
}

/*
Possible modes:
- SINGLE
- MULTIPLE
 */

const processReminderDetails = (message, args, mode) => {

    // destructure message components
    const {mentions, guild, channel} = message

    // remove additional spaces in command args
    args = args.filter(function (entry) {
        return entry.trim() !== '';
    });

    // check and save channel to send message in
    const targetChannel = mentions.channels.first()

    if (!targetChannel) {
        message.reply('please include (tag) the channel you want the message to be sent in');
        return;
    }
    args.shift() // remove arg (done with tagged channel)

    // check and save scheduled date/time
    // const scheduledInstant = new Date(args[0].trim());  // OLD
    const parseDateTimeResults = parseDateTime(args[0], args[1], args[2])
    const scheduledInstant = !parseDateTimeResults ? null : parseDateTimeResults.dateTime;
    const userTZ = parseDateTimeResults.tidyZone;
    
    if (!scheduledInstant) {
        message.reply('invalid date/time format – please follow the allowable formats'); // TODO: add link to format list
        return;
    }

    let multipleReminderInstants = []; // stores dateTime and humanReadableDiff

    args.shift() // remove arg (done with time)

    // filter to only process subsequent messages from original author
    const messageFilter = (incomingMessage) => {
        return incomingMessage.author.id === message.author.id
    }

    // declare variables within scope here
    let collector;
    let periods = "";
    let collectedMessages = [];
    let userError = false;

    // if using !scheduleMultiple or equiv. use this flow:
    if (mode === 'MULTIPLE') {

        // listen for 4 messages (reminder at event time, upcoming reminders, title, body)
        collector = new MessageCollector(channel, messageFilter, {
            max: 4,
            time: 1000 * 120 // 2 min window
        })

        message.reply("would you like a reminder at the **actual time of the event**? (specified in your message above) yes/no:");

        collector.on("collect", (collected) => {
            collectedMessages.push(collected);
            switch (collectedMessages.length) {
                case 1:
                    // validate yes/no from previous question
                    if (collectedMessages[0].content.toLowerCase() === "yes")
                        multipleReminderInstants.push({
                            dateTime: scheduledInstant,
                            humanReadableDiff: 'now'
                        });

                    else if (collectedMessages[0].content.toLowerCase() !== "no") {
                        message.reply("invalid response – please run the command again")
                        userError = true;
                        collector.stop();
                        return;
                    }

                    message.reply("list the **time periods** before the reminder date that you'd like reminders" +
                        "\n(allowed units: m/mins/minutes, h/hrs/hours, d/days – can be plural or singular):");
                    break;
                case 2:
                    // validate string structure (XXmin YYhrs ZZday) etc
                    periods = collectedMessages[1].content
                    periods = periods.trim() // trim whitespace at start and end of string
                    periods = periods.replace(/\s{2,}/g, ' '); // remove multiple consecutive spaces
                    const periodsCheck = periods.match(/(\d+(minute|hour|day|min|hr|m|h|d)s? ?( |$))+/g);
                    if (!periodsCheck || periods !== periodsCheck[0]) {
                        message.reply("invalid time periods – please run the command again." +
                            "\nonly use the following units, with a number in before them and a space separating each time period:" +
                            "\n**m/min/mins/minute/minutes, h/hr/hrs/hour/hours, d/day/days** (eg: 30mins 5hr 2d)");
                        userError = true;
                        collector.stop();
                        return;
                    }

                    message.reply("thanks, please send the **reminder title**:")
                    break;
                case 3:
                    message.reply("thanks, please send the **reminder body**:")
                    break;
            }
        })

        collector.on("end", () => {
            // if haven't received 4 messages by timeout, send error to user
            if (collectedMessages.length !== 4 && !userError) {
                message.reply("waiting timed out. please run the command again – you have 2 minutes for responding.")
                return;
            } else if (userError)
                return;

            // if 4 messages received, continue:

            // calculate datetimes for each additional reminder
            periods = periods.replace(/s/g, ''); // remove any 's' chars (plurals)
            periods = periods.split(" "); // create array

            // for each additional reminder, calculate and store datetime instant
            for (let i = 0; i < periods.length; i++) {
                const quantifier = periods[i].match(/\d+/g);
                const unit = periods[i].match(/(minute|hour|day|min|hr|m|h|d)/g);
                const diff = Number(quantifier) * timeUnitsToMs[unit]

                if (diff < 60000) continue; // if less than 1min diff, skip
                const offsetInstant = (new Date(scheduledInstant - diff));

                const humanReadableDiff = quantifier + " " + humanUnits[unit.toString().charAt(0)] + " reminder"

                multipleReminderInstants.push({
                    dateTime: offsetInstant,
                    humanReadableDiff: humanReadableDiff
                });

            }

            let DBErrorEncountered = false;
            for (let i = 0; i < multipleReminderInstants.length; i++) {
                const x = multipleReminderInstants[i];

                DBErrorEncountered = addReminderToDB(
                    (new Date(x.dateTime).toISOString().slice(0, -1)),
                    collectedMessages[2].content + " (" + x.humanReadableDiff + ")",
                    collectedMessages[3].content,
                    false
                );
                {
                    if (DBErrorEncountered) {
                        break;
                    }
                }
            }

            if (DBErrorEncountered)
                message.reply("sorry, an error occurred when trying to schedule your reminders." +
                    "\nplease try again — if the problem persists please wait until bugs fixes are released!");
            else {
                let s = "done! your reminders have been set for:\n"
                for (let i = 0; i < multipleReminderInstants.length; i++) {
                    s += "• " + moment(multipleReminderInstants[i].dateTime).tz(userTZ).format("DD MMM YYYY HH:mm") + " " + userTZ + "\n";
                }
                message.reply(s);
            }

        })

    // if single reminder (!schedule or equiv.) use this flow
    } else {
        // listen for 2 messages (title and body)
        collector = new MessageCollector(channel, messageFilter, {
            max: 2,
            time: 1000 * 60 // 1 min window
        })

        message.reply("please send the **reminder title**:");

        collector.on("collect", (collected) => {
            collectedMessages.push(collected);
            switch (collectedMessages.length) {
                case 1:
                    message.reply("thanks, please send the **reminder body**:")
                    break;
            }
        })

        collector.on("end", () => {
            if (collectedMessages.length !== 2) {
                message.reply("waiting timed out. please run the command again – you have 1 minute for responding.")
                return;
            }

            addReminderToDB(
                scheduledInstant.toISOString().slice(0, -1),
                collectedMessages[0].content,
                collectedMessages[1].content,
                true
            )

        })
    }

    // check and save role to mention
    const mentionableRoleID = mentions.roles.first() ? mentions.roles.first().id : null;
    logHandler.logMessage("role: " + mentionableRoleID, '**DEBUG**');


    function addReminderToDB(datetime, title, body, sendFeedbackToUser) {
        const dbErr = createReminder(
            datetime,
            title,
            body,
            false, // is embed?
            message.author.id,
            guild.id,
            targetChannel.id,
            mentionableRoleID
        );

        if (dbErr) {
            if (sendFeedbackToUser)
                message.reply("sorry, an error occurred when trying to schedule the message(s)." +
                    "\nplease try again — if the problem persists please wait until bugs fixes are released!");
            logHandler.logMessage("DB INSERT query error: " + dbErr, 'ERROR');
            return true;
        } else {
            if (sendFeedbackToUser)
                message.reply("message scheduled!");
            logHandler.logMessage("message scheduled", 'SUCCESS');
            return false;
        }
    }

}

function parseDateTime(date, time, zone) {
    /*
         allowed formats (date separators can be - / . ):
         DD/MM/YYY,HH:MM      (25/03/2021,14:30)
         DD/MMM/YYYY,HH:MM    (25/Sep/2021,14:30)
         YYYY-MM-DD,HH:MM     (2021-03-25,14:30)
    */

    try {

        const dateTime = date + "," + time;

        let possibleDateTimes = [];
        possibleDateTimes.push(dateTime.toLowerCase().trim().match(/(([0-9]{2}[\/\-\.][0-9]{2}[\/\-\.]20[0-9]{2}),[0-2]\d:[0-5]\d)/g));
        possibleDateTimes.push(dateTime.toLowerCase().trim().match(/(([0-9]{2}[\/\-\.](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\/\-\.]20[0-9]{2}),[0-2]\d:[0-5]\d)/g));
        possibleDateTimes.push(dateTime.toLowerCase().trim().match(/(((20[0-9]{2}[\/\-\.][0-9]{2}[\/\-\.][0-9]{2})),[0-2]\d:[0-5]\d)/g));

        const tidyZone = zone.trim().match(/\w+\/[\w\_]+/g)[0];

        const formats = [
            'DD-MM-YYYY,hh:mm',
            'DD-MMM-YYYY,hh:mm',
            'YYYY-MM-DD,hh:mm'
        ]

        let format;

        for (let i = 0; i < 3; i++) {
            if (!possibleDateTimes[i])
                continue;
            format = i;
            break;
        }

        possibleDateTimes[format][0] = possibleDateTimes[format][0].replace(/[\/\.]/g, "-")

        return {
            dateTime: moment.tz(possibleDateTimes[format], formats[format], tidyZone),
            tidyZone: tidyZone
        };

    } catch {
        return null;
    }
}


module.exports = processReminderDetails;