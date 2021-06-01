/* eslint-disable no-console */
/* eslint-disable array-callback-return */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class PartnerService extends Schmervice.Service {
  async getAllPartner(txn) {
    const { Partner } = this.server.models();
    let partner;
    try {
      partner = await Partner.query(txn).orderBy('name').withGraphFetched('users');
      return [null, partner];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }

  async getPartnerUsersDetails(partnerId, query) {
    const { User } = this.server.models();
    const { limit, page } = query;
    const offset = (page - 1) * limit;
    let res;
    try {
      res = await User.query()
        .skipUndefined()
        .orderBy('id')
        .limit(limit)
        .offset(offset)
        .where('partner_id', partnerId)
        .withGraphFetched('[registrations, classes, classes.[facilitator]]');
      res.map((allClasses) => {
        allClasses.classes.map((data) => {
          if (data.facilitator_id !== null) {
            data.facilitator_name = data.facilitator.name;
            data.facilitator_email = data.facilitator.email;
          }
          delete data.facilitator;
        });
      });

      return [null, res];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }
};
