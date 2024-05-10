const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const crypto = require('crypto');
const { errorHandler } = require('../errorHandling');

module.exports = class UserSessionService extends Schmervice.Service {
  async getSessionId() {
    const { UserSession } = this.server.models();
    let userSessionId;
    try {
      const id = crypto.randomBytes(64).toString('hex');
      userSessionId = await UserSession.query().insert({ id });
      return [null, id];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Error creating user session token';
      return [error, null];
    }
  }

  async validateSessionToken(token) {
    const { UserSession } = this.server.models();

    try {
      const isUserSessionValid = await UserSession.query().findById(token);

      return [null, !!isUserSessionValid];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Error validating user session token';
      return [error, null];
    }
  }

  async removeSessionToken(token) {
    const { UserSession } = this.server.models();

    try {
      const [err, isUserSessionValid] = await this.validateSessionToken(token);
      if (isUserSessionValid) {
        await UserSession.query().deleteById(token);
        return [null, { message: 'User session token removed' }];
      }
      return [null, { message: 'User session token not found' }];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Error removing user session token';
      return [error, null];
    }
  }
};
