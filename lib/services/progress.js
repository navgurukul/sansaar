const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class RecordService extends Schmervice.Service {
  async postRecord(received) {
    const { Record } = this.server.models();
    try {
      // const volunteers = await Volunteer.query();

      const data = await Record.query().insert(received);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
