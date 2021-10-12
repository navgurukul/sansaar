const cryptoRandomString = require('crypto-random-string');

module.exports = {
  randomGenerator: (name = '') => {
    const nameTrimmed = name.split(' ')[0].toLowerCase();
    return {
      id: `${nameTrimmed}${Math.random().toString(32).substring(2, 10)}`,
      // id: `@${nameTrimmed}${Math.random().toString(32).substring(2, 10)}:navgurukul.org`,
      password: cryptoRandomString({ length: 32, type: 'base64' }),
      secretId: cryptoRandomString({ length: 39, type: 'alphanumeric' }),
    };
  },
  randomProfileImage: (imagesObj) => {
    const keys = Object.keys(imagesObj);
    // eslint-disable-next-line
    return imagesObj[keys[(keys.length * Math.random()) << 0]];
  },

  timeFormatter: (hours24) => {
    const hour = hours24.split(':')[0];
    const mins = hours24.split(':')[1];
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const time = `${((+hour + 11) % 12) + 1}:${mins} ${suffix}`;
    return time;
  },

  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  UTCToISTConverter: (dateUTC) => {
    dateUTC = dateUTC.getTime();
    const dateIST = new Date(dateUTC);
    dateIST.setHours(dateIST.getHours() + 5);
    dateIST.setMinutes(dateIST.getMinutes() + 30);
    return dateIST;
  },

  convertToIST: (d) => {
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * +5.5);
  },

  parseISOStringToDateObj: (dateISO) => {
    const b = dateISO.split(/\D+/);
    // eslint-disable-next-line
    return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
  },

  dateObjToYYYYMMDDFormat: (dateObj) => {
    return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
  },
};
