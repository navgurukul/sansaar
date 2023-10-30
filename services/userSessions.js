const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const crypto = require('crypto');
const { errorHandler } = require('../errorHandling');

module.exports = class UserSessionService extends Schmervice.Service {
  /* eslint-disable */

  async getSessionId() {
    const { UserSession } = this.server.models();
    let userSessionId;
    console.log('getSessionId');
    try {
      const id = crypto.randomBytes(64).toString('hex');
      console.log(userSessionId, id);
      userSessionId = await UserSession.query().insert({ id });
      return [null, id];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Error creating user session token';
      return [error, null];
    }
    //   const { id } = this.server.models();
    //   let availableCourses;
    //   try {
    //     if (criteria == null) {
    //       availableCourses = await Courses.query();
    //     } else {
    //       availableCourses = await Courses.query().where(criteria);
    //     }
    //     return [null, availableCourses];
    //   } catch (err) {
    //     return [errorHandler(err), availableCourses];
    //   }
  }
};
