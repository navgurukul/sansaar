const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
const Manifest = require('./manifest');
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

  const { chatService } = server.services();

  // eslint-disable-next-line
  client.start().then(() => console.log('Client started!'));
  client.on('room.message', chatService.handleCommand.bind(this));

  return server;
};

if (!module.parent) {
  exports.deployment(true);

  process.on('unhandledRejection', (err) => {
    throw err;
  });
}
