try {
  const redis = require('redis');

  const redisClient = redis.createClient({
    port: 6379,
    host: '127.0.0.1',
  });

  // eslint-disable-next-line no-console
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();

  module.exports = redisClient;
} catch (err) {
  // eslint-disable-next-line no-console
  console.log(err);
}
