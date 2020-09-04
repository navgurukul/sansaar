const Schmervice = require('schmervice');

module.exports = class ClassesService extends Schmervice.Service {
  async getClasses(filters) {
    const { Classes } = this.server.models();
    const { startDate, endDate, lang } = filters;
    const classes = await Classes.query()
      .skipUndefined()
      .where('start_time', '>=', startDate)
      .andWhere('end_time', '<=', endDate)
      .andWhere('lang', lang);
    return classes;
  }

  async createClass(newClass) {
    const { Classes } = this.server.models();
    return Classes.query().insert(newClass);
  }

  async updateClass(id, classUpdates, txn) {
    const { Classes } = this.server.models();
    return Classes.query(txn).update(classUpdates).where('id', id);
  }
};
