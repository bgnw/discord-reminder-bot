const dbConn = require('../db/dbConn');

const createReminder = (timestamp, title, body, embed, userID, guildID, channelID, mentionableRoleID) => {

    // insert reminder into database, process success/error
    dbConn.query("INSERT INTO reminders_bot__scheduled_reminders " +
        "(timestamp, title, body, embed, userID, guildID, channelID, mentionableRoleID) " +
        "VALUES (CAST(? AS DATETIME),?,?,?,?,?,?,?)",
        [timestamp, title, body, embed ? 1 : 0, userID, guildID, channelID, mentionableRoleID],
        function (err) {
            if (err)
                return err.message;
        });

    return null;

}

module.exports = createReminder;