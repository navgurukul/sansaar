const Schmervice = require('schmervice');

module.exports = class DisplayService extends Schmervice.Service {
  userProfile = async (user) => user;
};
