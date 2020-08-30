const Schmervice = require('schmervice');
const { Boom } = require('@hapi/boom');

module.exports = class LiveClassesService extends Schmervice.Service {
  async createLiveClass(payloadObj, txn) {
    const { LiveClasses } = this.server.models();
    return LiveClasses.query(txn).insert(payloadObj);
  }

  async updateLiveClass(id, payloadObj, authUser, txn) {
    const { LiveClasses } = this.server.models();
    let updatedClass = null;
    if (authUser) {
      updatedClass = await LiveClasses.query(txn).update(payloadObj).where('id', id);
    } else {
      throw Boom.unauthorized('Unauthorized User');
    }
    return updatedClass;
  }
};
