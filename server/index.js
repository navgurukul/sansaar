const Glue = require('@hapi/glue');
const Manifest = require('./manifest');

exports.deployment = async (start) => {
  const manifest = Manifest.get('/');
  const server = await Glue.compose(manifest, { relativeTo: __dirname });

  // Printing a request log
  server.events.on('response', (request) => {
    request.log(
      `${request.info.remoteAddress}: ${request.method.toUpperCase()} ${request.url.path} --> ${
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

  return server;
};

if (!module.parent) {
  exports.deployment(true);

  process.on('unhandledRejection', (err) => {
    throw err;
  });
}
