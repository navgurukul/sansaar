const cryptoRandomString = require('crypto-random-string');

module.exports = {
  randomGenerator: (name = '') => {
    const nameTrimmed = name.split(' ')[0].toLowerCase();
    return {
      id: `${nameTrimmed}${Math.random().toString(32).substring(2, 10)}`,
      // id: `@${nameTrimmed}${Math.random().toString(32).substring(2, 10)}:navgurukul.org`,
      password: cryptoRandomString({ length: 32, type: 'base64' }),
    };
  },
  randomProfileImage: (imagesObj) => {
    const keys = Object.keys(imagesObj);
    // eslint-disable-next-line
    return imagesObj[keys[(keys.length * Math.random()) << 0]];
  },
};
