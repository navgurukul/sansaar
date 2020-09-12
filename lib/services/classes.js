const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');

module.exports = class ClassesService extends Schmervice.Service {
  async getUpcomingClasses(filters) {
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

  async deleteClass(classId) {
    const { Classes, ClassRegistrations } = this.server.models();
    await ClassRegistrations.query().delete().where('class_id', classId);
    return Classes.query().delete().where('id', classId);
  }

  async getClassById(classId) {
    const { Classes } = this.server.models();
    const classes = await Classes.query().findById(classId);
    if (classes) return classes;
    throw Boom.badRequest("Class doesn't exist");
  }

  async updateClass(id, classUpdates) {
    const { Classes } = this.server.models();
    return Classes.query().update(classUpdates).where('id', id);
  }
};
