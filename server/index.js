const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
/* eslint-disable */
const cron = require('node-cron');
const Promise = require('bluebird');
const _ = require('lodash');
const Manifest = require('./manifest');
const botHandling = require('../lib/bot/actions');
const { sleep } = require('../lib/helpers');
/* eslint-disable */

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

  /* Scheduler */
  cron.schedule('0 * * * * *', async () => {
    const UTCTime = new Date().getTime();
    const ISTTime = new Date(UTCTime - new Date().getTimezoneOffset() * 60000);
    const upcomingClasses = await classesService.getAllClasses(ISTTime);
    const getISTTime = ISTTime.getTime();
    const fifteenMinutesFromNow = new Date(ISTTime.setTime(getISTTime + 15 * 60 * 1000));
    const userPromises = [];
    const classResolved = [];

    /**
     * Iterate over the list of upcoming class
     * and check if any class is scheduled at 15 minutes from now
     * NOTE : Client and Server should be designed
     *        to not allow any number other than 0(zero)
     *        as the seconds value in timestamp,
     *        because the cron job executes once every minute at 0th second
     *        taking performance issues into consideration
     */

    upcomingClasses.forEach(async (classes) => {
      let startTime = JSON.stringify(classes.start_time).substring(1, 17);
      let timePlus15 = JSON.stringify(fifteenMinutesFromNow).substring(1, 17);
      if (startTime === timePlus15) {
        const users = displayService.getClassRegisteredUsers(classes.id);
        userPromises.push(users);
        classResolved.push(classes);
      }
    });

    /**
     * allUsersAllClasses is a 2D array containing arrays of registered users
     * Each inner array represents a class
     */
    let allUsersAllClasses = await Promise.all(userPromises);

    /**
     * The following line
     * is just for testing
     * remove it after testing
     * TESTING_USERS is just a testing simulation, gives you multiple fake accounts to test on
     *
     */

    // const TESTING_USERS = await userService.getUserByEmail('delete');

    /**
     * The following line
     * is just for testing
     * remove it after testing
     */

    // allUsersAllClasses = [TESTING_USERS];

    //classResolved contains list of upcoming classes
    await iterateOverClasses(0, classResolved);

    async function iterateOverClasses(i, classResolved) {
      if (i < classResolved.length) {
        await iterateOverUsersOfClass(0, allUsersAllClasses[i], classResolved[i]);
      }
      if (i < classResolved.length - 1) {
        await iterateOverClasses(i + 1, classResolved);
      }
      return null;
    }

    async function iterateOverUsersOfClass(i, classUsers, currentClass) {
      if (classUsers[i].chat_id !== null) {
        const privateRoom = await botHandling.getPrivateRoomId(
          `@${classUsers[i].chat_id}:navgurukul.org`
        );
        if (privateRoom !== 'user_not_found') {
          try {
            await chatService.sendScheduledMessage(privateRoom, currentClass);
          } catch {
            /**
             * We have upped the limit of matrix API
             * requests per second (100) so it should
             * never go into the catch statement
             * However it stays as a fallback
             */
            await sleep(10000);
            await chatService.sendScheduledMessage(privateRoom, currentClass);
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
  });
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
