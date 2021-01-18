const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
/* eslint-disable */
const cron = require('node-cron');
const Manifest = require('./manifest');

const knexfile = require('../knexfile');
const knex = require('knex')(knexfile);

// const bolKnexfile = require('./knex');
// const bolKnex = require('knex')({ client: 'pg' })(bolKnexfile);

/* eslint-disable */

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
  console.log(`Server started at ${server.info.uri}`);
  server.chatClient = client;

  // eslint-disable-next-line
  const { chatService, classesService, userService, displayService } = server.services();

  client.start().then(() => {
    // eslint-disable-next-line
    console.log('Client started!');
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
