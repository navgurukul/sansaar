const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Package = require('../../../package.json');
const CONSTANTS = require('../../../lib/config');

module.exports = {
  // name: 'app-swagger',
  // async register(server) {
  //   await server.register([
  //     Inert,
  //     Vision,
  //     {
  //       plugin: HapiSwagger,
  //       options: {
  //         validatorUrl: null,
  //         info: {
  //           title: 'NG Sansaar API Docs',
  //           version: Package.version,
  //         },
  //         securityDefinitions: {
  //           jwt: {
  //             type: 'apiKey',
  //             name: 'Authorization',
  //             in: 'header',
  //           },
  //         },
  //         schemes: ['http', 'https'],
  //         security: [{ jwt: [] }],
  //         swaggerUIPath: CONSTANTS.swagger.uiPath,
  //         jsonPath: CONSTANTS.swagger.jsonPath,
  //         basePath: CONSTANTS.swagger.basePath,
  //       },
  //     },
  //   ]);
  // },

  // <<<<<<<<<<>>>>>>>>>>>  New code ---
  name: 'app-swagger',
  async register(server) {
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: {
          validatorUrl: null,
          info: {
            title: 'NG Sansaar API Docs',
            version: Package.version,
          },
          securityDefinitions: {
            cookieAuth: {
              type: 'apiKey',
              name: 'session',
              in: 'cookie',
            },
          },
          schemes: ['http', 'https'],
          security: [{ cookieAuth: [] }],
          swaggerUIPath: CONSTANTS.swagger.uiPath,
          jsonPath: CONSTANTS.swagger.jsonPath,
          basePath: CONSTANTS.swagger.basePath,
        },
      },
    ]);
  },
};
