const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class PartnerService extends Schmervice.Service {
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
        .withGraphFetched('[registrations, classes]');
      return [null, res];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }
};
