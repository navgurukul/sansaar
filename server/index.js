const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
/* eslint-disable */
const cron = require('node-cron');
const Manifest = require('./manifest');

const knexfile = require('../knexfile');
const knex = require('knex')(knexfile);

// const config = require('config');
const logger = require('./logger');
const { UTCToISTConverter } = require('../lib/helpers/index');

// const bolKnexfile = require('./knex');
// const bolKnex = require('knex')({ client: 'pg' })(bolKnexfile);

/* eslint-disable */

// disable matrix logs
sdk.LogService.setLevel(sdk.LogLevel.WARN);

const CONFIG = require('../lib/config/index');
const {
  classReminderScheduler,
  classFeedbackScheduler,
  clearInactiveKnexConnections,
} = require('../lib/schedulers');

exports.deployment = async (start) => {
  const manifest = Manifest.get('/');
  const server = await Glue.compose(manifest, { relativeTo: __dirname });

  // Printing a request log
  server.events.on('response', (request) => {
    request.log(
      `${request.info.remoteAddress}: ${request.method.toUpperCase()} ${request.path} --> ${
        request.response.statusCode
      }`
    );
  });

  const { MatrixClient, AutojoinRoomsMixin, SimpleFsStorageProvider } = sdk;
  const homeserverUrl = 'https://m.navgurukul.org';
  const { accessToken } = CONFIG.auth.chat;
  const storage = new SimpleFsStorageProvider('bot.json');
  const client = new MatrixClient(homeserverUrl, accessToken, storage);
  AutojoinRoomsMixin.setupOnClient(client);

  // Set the matrix client before initializing the server
  server.app.chatClient = client;

  await server.initialize();

  if (!start) {
    return server;
  }

  await server.start();

  /* Scheduler */
  cron.schedule('0 * * * * *', async () => {
    classReminderScheduler(classesService, chatService, displayService);
    classFeedbackScheduler(classesService, chatService, displayService);
  });

  // cron.schedule('0 * * * * *', async () => {
  //   console.log('*********************************************');
  //   console.log('WILL CLEAR KNEX CONN');
  //   console.log('*********************************************');

  // clearInactiveKnexConnections(knex);
  // clearInactiveKnexConnections(bolKnex);
  // });
  /* Scheduler */

  // eslint-disable-next-line no-console
  logger.info(`Server started at ${server.info.uri}`);
  server.chatClient = client;

  // eslint-disable-next-line
  const {
    chatService,
    classesService,
    userService,
    displayService,
    calendarService,
  } = server.services();

  /* Scheduler- call calendar patch API in every 10 min*/
  cron.schedule('00 */30 * * * *', async () => {
    // 2 hours duration
    const duration = UTCToISTConverter(
      new Date(new Date().setMinutes(new Date().getMinutes() + 120))
    );
    const [err, nextTwoHoursClasses] = await classesService.getClassesForXXXTime(duration);
    if (!err) {
      for (const c of nextTwoHoursClasses) {
        let emailList = [];
        let userIds = [];
        var { start_time, end_time, ..._c } = c;
        for (const regUser of c.registrations) {
          if (regUser.google_registration_status === false) {
            userIds.push(regUser.user_id);
            const [err, classRegUser] = await userService.findById(regUser.user_id);
            if (!err) {
              emailList.push({ email: classRegUser.email });
            }
            // letting google calendar deciding the previous attendees
            let regUsers;
            try {
              regUsers = await calendarService.getCalendarEvent(
                c.recurring_id !== null ? c.parent_class.calendar_event_id : c.calendar_event_id,
                c.facilitator_id,
                c.facilitator_email
              );
              if (regUsers.data.attendees) emailList.push(...regUsers.data.attendees);
            } catch (err) {
              logger.error(`line no-123, Calendar event error-` + JSON.stringify(err));
              return { error: true, message: 'Calendar event error, please contact to admin' };
            }
          }
        }
        // console.log(c, emailList, 'c, emailList\n\n');
        await calendarService.patchCalendarEvent(_c, emailList);
        await classesService.updateGRegistrationStatusById(c.id, userIds);
      }
    }
  });

  client.start().then(() => {
    // eslint-disable-next-line
    logger.info('Client started!');
  });
  client.on('room.message', chatService.handleCommand.bind(this));

  return server;
};

if (!module.parent) {
  exports.deployment(true);

  process.on('unhandledRejection', (err) => {
    throw err;
  });
}
