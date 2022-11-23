/* eslint-disable no-undef */
const fs = require('fs-extra');
const path = require('path');
const logger = require('../../server/logger');

const tenDayInMilliseconds = 3600 * 24 * 10 * 1000; // 864000000 milliseconds
const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const dateInSec = new Date(currentDate).getTime(); // currentDate in Milliseconds

module.exports = () => {
  logger.info('🧹 logs cleanup started');
  const logPath = path.resolve(__dirname, '../../logs');
  const logs = fs.readdirSync(logPath);
  // eslint-disable-next-line no-restricted-syntax
  for (log of logs) {
    if (log.includes('NodeWinstonApp')) {
      const fileDate = log.match(/NodeWinstonApp-(.*?)-\d.\./)[1];
      const fileDateInSec = new Date(fileDate).getTime();
      if (dateInSec - fileDateInSec > tenDayInMilliseconds) {
        fs.unlinkSync(path.resolve(`${logPath}/${log}`));
      }
    }
  }
  logger.info('🚮logs cleanup finished');
};
