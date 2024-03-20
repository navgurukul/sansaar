const Dotenv = require('dotenv');
const Confidence = require('confidence');
const Toys = require('toys');
const Boom = require('@hapi/boom');
// const CatboxRedis = require('@hapi/catbox-redis');
// Pull .env into process.env
Dotenv.config({ path: `${__dirname}/.env` });

// Glue manifest as a confidence store
module.exports = new Confidence.Store({
  server: {
    host: '0.0.0.0',
    port: {
      $env: 'PORT',
      $coerce: 'number',
      $default: 5000,
    },
    // cache: [
    //   {
    //     name: 'my_cache',
    //     provider: {
    //       constructor: CatboxRedis,
    //       options: {
    //         partition: 'sansaar',
    //         host: 'localhost',
    //         port: 6379,
    //       },
    //     },
    //   },
    // ],
    debug: {
      $filter: { $env: 'NODE_ENV' },
      $default: {
        log: '*',
        request: '*',
      },
      production: {
        log: ['error'],
        request: ['error'],
      },
    },
    routes: {
      cors: {
        origin: ['*'],
        additionalHeaders: [
          'cache-control',
          'x-requested-with',
          'platform',
          'version-code',
          'code',
          'register-to-all',
          'unregister-all',
          'register-to-all',
          'delete-all',
          'update-all',
          'role',
        ],
        headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match', 'Accept-language'],
      },
      timeout: {
        socket: 11 * 60 * 1000, // Determines how long before closing request socket.
        server: false, // How long to wait for server request processing. Disabled by default
      },
      validate: {
        options: {
          abortEarly: false,
        },
        failAction: async (request, h, err) => {
          if (process.env.NODE_ENV === 'production') {
            // In prod, log a limited error message and throw the default Bad Request error.
            // eslint-disable-next-line no-console
            console.error('ValidationError:', err.message);
            throw Boom.badRequest('Invalid request payload input');
          } else {
            // During development, log and respond with the full error.
            // eslint-disable-next-line no-console
            console.error(err);
            throw err;
          }
        },
      },
    },
  },
  register: {
    plugins: [
      {
        plugin: '../lib', // Main plugin
      },
      {
        plugin: {
          $filter: { $env: 'NODE_ENV' },
          $default: 'hpal-debug',
          production: Toys.noop,
        },
      },
      {
        plugin: 'schwifty',
        options: {
          $filter: { $env: 'NODE_ENV' },
          $default: {},
          $base: {
            migrateOnStart: true,
            knex: {
              client: 'pg',
              migrations: {
                stub: 'lib/migrations/templates/defaultMigrationTemplate.js',
                directory: 'lib/migrations',
                schemaName: 'main',
              },
              connection: {
                database: {
                  $env: 'DB_NAME',
                },
                host: {
                  $env: 'DB_HOST',
                },
                user: {
                  $env: 'DB_USER',
                },
                password: {
                  $env: 'DB_PASS',
                },
                requestTimeout: 90000,
                connectionTimeout: 30000,
                acquireConnectionTimeout: 30000,
                typeCast(field, next) {
                  // Convert 1 to true, 0 to false, and leave null alone
                  if (field.type === 'TINY' && field.length === 1) {
                    const value = field.string();
                    return value ? value === '1' : null;
                  }
                  return next();
                },
              },
              pool: {
                min: 4,
                max: 100,
              },
            },
          },
          production: {
            migrateOnStart: false,
          },
        },
      },
      {
        plugin: './plugins/swagger',
      },
      /*{
        // eslint-disable-next-line
        plugin: require('hapi-sentry'),
        options: {
          client: {
            dsn: {
              $env: 'DSN',
            },
            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: 1.0,
          },
        },
      },*/
    ],
  },
});
