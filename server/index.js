const Glue = require('@hapi/glue');
const sdk = require('matrix-bot-sdk');
const CONFIG = require('../lib/config');
const Manifest = require('./manifest');

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

  await server.initialize();

  if (!start) {
    return server;
  }

  await server.start();

  // eslint-disable-next-line no-console
  console.log(`Server started at ${server.info.uri}`);

  const { MatrixClient, AutojoinRoomsMixin, SimpleFsStorageProvider } = sdk;
  const homeserverUrl = 'https://m.navgurukul.org'; // make sure to update this with your url
  const accessToken = CONFIG.CHAT_ACCESS_TOKEN;
  const storage = new SimpleFsStorageProvider('bot.json');
  const client = new MatrixClient(homeserverUrl, accessToken, storage);
  AutojoinRoomsMixin.setupOnClient(client);

  server.chatClient = client;
  const { ChatService } = server.services();
  client.on('room.message', ChatService.handleCommand);
  return server;
};

if (!module.parent) {
  exports.deployment(true);

  process.on('unhandledRejection', (err) => {
    throw err;
  });
}
