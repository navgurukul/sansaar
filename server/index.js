const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
const cron = require('node-cron');
const _ = require('lodash');
const Manifest = require('./manifest');
const botHandling = require('../lib/bot/index');
const CONFIG = require('../lib/config/index');

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

  // eslint-disable-next-line no-console
  console.log(`Server started at ${server.info.uri}`);
  server.chatClient = client;

  const { chatService, classesService, displayService } = server.services();

  client.start().then(() => {
    // eslint-disable-next-line
    console.log('Client started!');
  });
  client.on('room.message', chatService.handleCommand.bind(this));

  /* Scheduler */
  const upcomingClasses = await classesService.getUpcomingClasses({});
  _.forEach(upcomingClasses, async (upcomingClass) => {
    let startFullTime = upcomingClass.start_time;

    if (typeof upcomingClass.start_time !== 'string') {
      startFullTime = startFullTime.toISOString();
    }
    const timeSplitted = startFullTime.split('T');

    const month = timeSplitted[0].split('-')[1];
    const date = timeSplitted[0].split('-')[2];
    const hours = timeSplitted[1].split(':')[0];
    const minutes = timeSplitted[1].split(':')[1];
    const seconds = timeSplitted[1].split(':')[2].split('.')[0];

    let realMinutes = minutes - 15;
    let realHours = hours;
    if (realMinutes < 0) {
      realHours = hours - 1;
      if (realHours < 0) {
        realHours = 23;
      }
      realMinutes += 60;
    }

    cron.schedule(`${seconds} ${realMinutes} ${realHours} ${date} ${month} *`, async () => {
      const users = await displayService.getClassRegisteredUsers(upcomingClass.id);
      _.forEach(users, async (user) => {
        const privateRoom = await botHandling.getPrivateRoomId(`@${user.chat_id}:navgurukul.org`);
        if (privateRoom !== null) {
          await chatService.sendScheduledMessage(privateRoom);
        }
      });
    });
  });
  /* Scheduler */

  return server;
};

if (!module.parent) {
  exports.deployment(true);

  process.on('unhandledRejection', (err) => {
    throw err;
  });
}
