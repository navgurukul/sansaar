const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(data, user_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      const finalData = {
        ...data,
        user_id,
      };
      const C4caTeacher = await C4caTeachers.query().insert(finalData);
      return [null, C4caTeacher];

    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
