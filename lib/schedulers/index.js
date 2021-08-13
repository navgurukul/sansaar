const axios = require('axios');
const botHandling = require('../bot/actions');
const { sleep } = require('../helpers');
const classesService = require('../services/classes');
const CONFIG = require('../config/index');

console.log(CONFIG.auth.sendMail.sendMailToClassFacilitator, 'Scheduler\n');

const sendFeedbackMail = async (classesService) => {
  const baseURL = CONFIG.auth.sendMail.sendMailToClassFacilitator;
  const data = await classesService.getAllClassesMailByTime();
  const UTCTime = new Date().getTime();
  const ISTTime = new Date(UTCTime - new Date().getTimezoneOffset() * 60000);
  console.log(ISTTime, 'ISTTime\n\n');
  for (var classType of data) {
    const classDetails = await classesService.getClassById(classType.class_id);
    if (classType.type !== 'sendFirstMailAfterRegistration') {
      console.log(classDetails, 'classDetails\n\n');
      if (classDetails[0] === null) {
        const name = classDetails[1].facilitator_name;
        if (classDetails[1].end_time < ISTTime) {
          await axios
            .post(baseURL + classType.type, {
              name: classDetails[1].facilitator_name,
              email: classDetails[1].facilitator_email,
            })
            .then(async (res) => {
              if (res.data.status === 'success') {
                // send mail
                await classesService.updateClassMailById(classType.id, { status: 'success' });
              }
            });
        }
      }
    } else {
      await axios
        .post(baseURL + classType.type, {
          name: classDetails[1].facilitator_name,
          email: classDetails[1].facilitator_email,
        })
        .then(async (res) => {
          if (res.data.status === 'success') {
            // send mail after 1st class registration if status is pending.
            await classesService.updateClassMailById(classType.id, { status: 'success' });
          }
        });
    }
  }
  console.log(data, 'data scheduler .....data\n\n');
};

const classReminderScheduler = async (classesService, chatService, displayService) => {
  const UTCTime = new Date().getTime();
  const ISTTime = new Date(UTCTime - new Date().getTimezoneOffset() * 60000);
  const [err, upcomingClasses] = await classesService.getAllClasses(ISTTime);
  if (err) {
    return err;
  }
  const getISTTime = ISTTime.getTime();
  const fifteenMinutesFromNow = new Date(ISTTime.setTime(getISTTime + 15 * 60 * 1000));
  const userPromises = [];
  const classResolved = [];

  upcomingClasses.forEach(async (classes) => {
    const startTime = JSON.stringify(classes.start_time).substring(1, 17);
    const timePlus15 = JSON.stringify(fifteenMinutesFromNow).substring(1, 17);
    if (startTime === timePlus15) {
      const users = displayService.getClassRegisteredUsers(classes.id);
      userPromises.push(users);
      classResolved.push(classes);
    }
  });
  const allUsersAllClasses = await Promise.all(userPromises);

  async function iterateOverUsersOfClass(i, classUsers, currentClass) {
    if (classUsers[i].chat_id !== null || classUsers[i].chat_id !== undefined) {
      const privateRoom = await botHandling.getPrivateRoomId(
        `@${classUsers[i].chat_id}:navgurukul.org`
      );
      if (privateRoom !== 'user_not_found') {
        try {
          await chatService.sendScheduledReminder(privateRoom, currentClass);
        } catch {
          await sleep(10000);
          await chatService.sendScheduledReminder(privateRoom, currentClass);
        }
      }
    }
    if (i < classUsers.length - 1) {
      setTimeout(async () => {
        await iterateOverUsersOfClass(i + 1, classUsers, currentClass);
      }, Math.random() * 1000);
    }
    return null;
  }

  // eslint-disable-next-line
  async function iterateOverClasses(i, classResolved) {
    if (i < classResolved.length) {
      await iterateOverUsersOfClass(0, allUsersAllClasses[i], classResolved[i]);
    }
    if (i < classResolved.length - 1) {
      await iterateOverClasses(i + 1, classResolved);
    }
    return null;
  }
  await iterateOverClasses(0, classResolved);
  return null;
};

const classFeedbackScheduler = async (classesService, chatService, displayService) => {
  const UTCTime = new Date().getTime();
  const ISTTimeNow = new Date(UTCTime - new Date().getTimezoneOffset() * 60000);
  const ISTTimeADateBefore = new Date(
    UTCTime - new Date().getTimezoneOffset() * 60000 - 24 * 60 * 60000
  );
  const [err, upcomingClasses] = await classesService.getAllClasses(ISTTimeADateBefore);
  if (err) {
    return err;
  }
  const getISTTime = ISTTimeNow.getTime();
  const fifteenMinutesBefore = new Date(ISTTimeNow.setTime(getISTTime - 15 * 60 * 1000));
  const userPromises = [];
  const classResolved = [];

  upcomingClasses.forEach(async (classes) => {
    const endTime = JSON.stringify(classes.end_time).substring(1, 17);
    const timeMinus15 = JSON.stringify(fifteenMinutesBefore).substring(1, 17);

    if (endTime === timeMinus15) {
      const users = displayService.getClassRegisteredUsers(classes.id);
      userPromises.push(users);
      classResolved.push(classes);
    }
  });
  const allUsersAllClasses = await Promise.all(userPromises);

  async function iterateOverUsersOfClass(i, classUsers, currentClass) {
    if (classUsers[i].chat_id !== null || classUsers[i].chat_id !== undefined) {
      const privateRoom = await botHandling.getPrivateRoomId(
        `@${classUsers[i].chat_id}:navgurukul.org`
      );
      if (privateRoom !== 'user_not_found') {
        try {
          await chatService.askClassFeedback(privateRoom, currentClass);
        } catch {
          await sleep(10000);
          await chatService.askClassFeedback(privateRoom, currentClass);
        }
      }
    }
    if (i < classUsers.length - 1) {
      setTimeout(async () => {
        await iterateOverUsersOfClass(i + 1, classUsers, currentClass);
      }, Math.random() * 1000);
    }
    return null;
  }

  // eslint-disable-next-line
  async function iterateOverClasses(i, classResolved) {
    if (i < classResolved.length) {
      await iterateOverUsersOfClass(0, allUsersAllClasses[i], classResolved[i]);
    }
    if (i < classResolved.length - 1) {
      await iterateOverClasses(i + 1, classResolved);
    }
    return null;
  }
  await iterateOverClasses(0, classResolved);
  return null;
};

const clearInactiveKnexConnections = async (knex) => {
  knex.raw(`WITH inactive_connections AS (
    SELECT
        pid,
        rank() over (partition by client_addr order by backend_start ASC) as rank
    FROM
        pg_stat_activity
    WHERE
        -- Exclude the thread owned connection (ie no auto-kill)
        pid <> pg_backend_pid( )
    AND
        -- Exclude known applications connections
        application_name !~ '(?:psql)|(?:pgAdmin.+)'
    AND
        -- Include connections to the same database the thread is connected to
        datname = current_database()
    AND
        -- Include connections using the same thread username connection
        usename = current_user
    AND
        -- Include inactive connections only
        state in ('idle', 'idle in transaction', 'idle in transaction (aborted)', 'disabled')
    AND
        -- Include old connections (found with the state_change field)
        current_timestamp - state_change > interval '5 minutes'
)
SELECT
    pg_terminate_backend(pid)
FROM
    inactive_connections
WHERE
    rank > 1 -- Leave one connection for each application connected to the database`);
};

module.exports = {
  classReminderScheduler,
  classFeedbackScheduler,
  clearInactiveKnexConnections,
  sendFeedbackMail,
};
