const Schmervice = require('schmervice');

module.exports = class PathwayService extends Schmervice.Service {
  async create(pathwayInfo, txn) {
    const { Pathway } = this.server.models();
    return await Pathway.query(txn).insert(pathwayInfo);
  }

  async find(txn) {
    const { Pathway } = this.server.models();
    return Pathway.query(txn);
  }

  async findById(id, txn) {
    const { Pathway } = this.server.models();
    const pathway = await Pathway.query(txn).throwIfNotFound().findById(id);
    return pathway;
  }

  async update(id, info, txn) {
    const { Pathway } = this.server.models();

    await Pathway.query(txn).update(info).where({id});

    return id;
  }
};
