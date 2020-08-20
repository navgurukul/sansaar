'use strict';

const Schmervice = require('schmervice');

module.exports = class ProgressTrackingService extends Schmervice.Service {
  async createParameter(info, txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn).insert(info);
  }

  async findParameters(txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn);
  }

  async updateParameter(id, info, txn) {
    const { ProgressParameter } = this.server.models();

    await ProgressParameter.query(txn).update(info).where({ id });
    return id;
  }

  async findParameterById(id, info, txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn).throwIfNotFound().findById(id);
  }
};
