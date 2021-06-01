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

      // for (const i in res) {
      //   // eslint-disable-next-line no-restricted-syntax
      //   for (const j in res[i].classes) {
      //     if (res[i].classes[j].facilitator_id !== null) {
      //       // eslint-disable-next-line no-await-in-loop
      //       const data = await User.query()
      //         .select('name', 'email')
      //         .where('id', res[i].classes[j].facilitator_id);
      //       res[i].classes[j].facilitator_name = data[0].name;
      //       res[i].classes[j].facilitator_email = data[0].email;
      //     }
      //   }
      // }
      return [null, res];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }
};
