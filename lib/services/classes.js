const Schmervice = require('schmervice');

module.exports = class ClassesService extends Schmervice.Service {
  async getClasses(filters) {
    const { Classes } = this.server.models();
    const { startDate, endDate, lang, classType } = filters;
    const classes = await Classes.query()
      .skipUndefined()
      .where('start_time', '>=', startDate)
      .andWhere('end_time', '<=', endDate)
      .andWhere('lang', lang)
      .andWhere('class_type', classType)
      .limit(100)
      .orderBy('start_time');
    return classes;
  }

  async createClass(newClass) {
    const { Classes } = this.server.models();
    return Classes.query().insert(newClass);
  }

  async updateClass(id, classUpdates) {
    const { Classes } = this.server.models();
    return Classes.query().update(classUpdates).where('id', id);
  }
};
