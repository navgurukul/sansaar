const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
/* eslint-disable */
const cron = require('node-cron');
const Promise = require('bluebird');
const _ = require('lodash');
const Manifest = require('./manifest');
const botHandling = require('../lib/bot/actions');
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
    console.log(fifteenMinutesFromNow);
    // console.log(upcomingClasses);
    const userPromises = [];
    const classResolved = [];
    upcomingClasses.forEach(async (classes) => {
      let startTime = JSON.stringify(classes.start_time).substring(1, 17);
      let timePlus15 = JSON.stringify(fifteenMinutesFromNow).substring(1, 17);
      if (startTime === timePlus15) {
        const users = displayService.getClassRegisteredUsers(classes.id);
        userPromises.push(users);
        classResolved.push(classes);
      }
    });
    const allUserAllClasses = await Promise.all(userPromises);

    const TESTING_USERS = await userService.getUserByEmail('delete');
    const mainPromise = [];

    // allUserAllClasses.forEach(async (classUsers, index) => {
    //   classUsers.forEach(async (users) => {
    //     const privateRoom = await botHandling.getPrivateRoomId(
    //       `@${users.chat_id}:navgurukul.org`
    //     );
    //     if (privateRoom !== null) {
    //       console.log(privateRoom);

    //       const sendMessage = await chatService.sendScheduledMessage(
    //         privateRoom,
    //         classResolved[index]
    //       );
    //       mainPromise.push(sendMessage);
    //       console.log(`Sent to ${TESTING_USERS[index].name}`);
    //     }
    //   });
    // });
    allUserAllClasses.forEach(async (classUsers) => {
      TESTING_USERS.forEach(async (USER) => {
        const privateRoom = await botHandling.getPrivateRoomId(`@${USER.chat_id}:navgurukul.org`);
        if (privateRoom !== null) {
          console.log('HERE TOOOOOOO');
          console.log(privateRoom);

          const sendMessage = chatService.sendScheduledMessage(privateRoom, classResolved[0]);
          mainPromise.push(sendMessage);
          console.log(`Sent to ${USER.name}`);
        }
      });
    });

    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log(mainPromise.length);
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');

    // await Promise.all(mainPromise);
    await Promise.each(
      mainPromise,
      (promiseFn) => {
        return promiseFn();
      },
      { concurrency: 1 }
    );
  });

  // async function Scheduler(upcomingClasses) {
  //   _.forEach(upcomingClasses, async (upcomingClass) => {
  //     let startFullTime = upcomingClass.start_time;

  //     if (typeof upcomingClass.start_time !== 'string') {
  //       startFullTime = startFullTime.toISOString();
  //     }
  //     const timeSplitted = startFullTime.split('T');

  //     const month = timeSplitted[0].split('-')[1].toString();
  //     const date = timeSplitted[0].split('-')[2].toString();
  //     const hours = timeSplitted[1].split(':')[0];
  //     const minutes = timeSplitted[1].split(':')[1];

  //     let realMinutes = minutes - 15;
  //     let realHours = hours;
  //     if (realMinutes < 0) {
  //       realHours = hours - 1;
  //       if (realHours < 0) {
  //         realHours = 23;
  //       }
  //       realMinutes += 60;
  //     }
  //     realHours = realHours.toString();
  //     realMinutes = realMinutes.toString();

  //     // let realMinutesUR = (+realMinutes + 5).toString();
  //     // let realHoursUR = realHours;

  //     // if (+realMinutesUR >= 60) {
  //     //   realMinutesUR = (+realMinutesUR - 60).toString();
  //     //   realHoursUR = (+realHoursUR + 1).toString();
  //     //   if (+realHoursUR > 23) {
  //     //     realHoursUR = (+realHoursUR - 24).toString();
  //     //   }
  //     //   console.log(realMinutesUR, realHoursUR);
  //     // }
  //     console.log(`* ${realMinutes} ${realHours} ${date} ${month} *`);
  //     cron.schedule(`*/20 ${realMinutes} ${realHours} ${date} ${month} *`, async () => {
  //       const users = await displayService.getClassRegisteredUsers(upcomingClass.id);

  //       _.forEach(users, async (user) => {
  //         console.log('**************************************************');
  //         console.log('TESTING REACHED HERE');
  //         console.log('**************************************************');

  //         const privateRoom = await botHandling.getPrivateRoomId(`@${user.chat_id}:navgurukul.org`);
  //         if (privateRoom !== null) {
  //           console.log('HERE TOOOOOOO');
  //           /* set timeout to avoid 'TOO MANY REQUESTS' error
  //              Not Sure if it works when there are large number of attendees of a single class
  //              Will send messages to 60 people in a minute. */
  //           console.log(privateRoom, upcomingClass);
  //           // setTimeout(async () => {
  //           //   await chatService.sendScheduledMessage(privateRoom, upcomingClass);
  //           // }, 1000);
  //         }
  //       });
  //     });
  //     return '****************************SENT********************************';
  //   });
  //   // return 'DONE';
  // }

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
