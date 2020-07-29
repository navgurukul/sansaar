const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const Handlebars = require('handlebars');
const HapiSwagger = require('hapi-swagger');
const Package = require('../../../package.json');

const swaggerUIPath = process.env.NODE_ENV === 'production' ? '/api/swaggerui/' : '/swaggerui/';

module.exports = {
  name: 'app-swagger',
  async register(server) {
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: {
          documentationPage: false,
          validatorUrl: null,
          info: {
            version: Package.version,
          },
          securityDefinitions: {
            jwt: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
            },
          },
          swaggerUIPath,
        },
      },
    ]);

    server.views({
      engines: { html: Handlebars },
      path: __dirname,
    });

    server.route({
      method: 'get',
      path: '/documentation',
      handler: { view: { template: 'swagger' } },
    });
  },
};
