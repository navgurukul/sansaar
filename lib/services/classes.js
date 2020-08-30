const Schmervice = require('schmervice');
const { Boom } = require('@hapi/boom');

module.exports = class ClassesService extends Schmervice.Service {
  async createClass(payloadObj, txn) {
    const { Classes } = this.server.models();
    return Classes.query(txn).insert(payloadObj);
  }

  async updateClass(id, payloadObj, authUser, txn) {
    const { Classes } = this.server.models();
    let updatedClass = null;
    if (authUser) {
      updatedClass = await Classes.query(txn).update(payloadObj).where('id', id);
    } else {
      throw Boom.unauthorized('Unauthorized User');
    }
    return updatedClass;
  }
};
