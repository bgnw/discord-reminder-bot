create table reminders_bot__scheduled_reminders
(
    reminderID        INT            AUTO_INCREMENT NOT NULL PRIMARY KEY,
    timestamp         DATETIME(0)    NOT NULL,
    content           VARCHAR(5000)  NOT NULL,
    userID            VARCHAR(66)    NOT NULL,
    guildID           VARCHAR(66)    NOT NULL,
    channelID         VARCHAR(66)    NOT NULL,
    mentionableRoleID VARCHAR(66)
);