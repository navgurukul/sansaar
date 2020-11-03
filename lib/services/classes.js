const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');

module.exports = class classesService extends Schmervice.Service {
  async getAllClasses(startDate) {
    const { Classes } = this.server.models();
    return Classes.query()
      .skipUndefined()
      .where('start_time', '>=', startDate)
      .orderBy('start_time');
  }

  async getUpcomingClasses(filters, userId) {
    const { Classes, ClassRegistrations } = this.server.models();
    const { startDate, endDate, lang, classType } = filters;
    const classes = await Classes.query()
      .skipUndefined()
      .where('start_time', '>=', startDate)
      .andWhere('end_time', '<=', endDate)
      .andWhere('lang', lang)
      .andWhere('type', classType)
      .limit(100)
      .orderBy('start_time');

    if (userId !== undefined) {
      const enrolledClassIdList = [];
      const classesOfUser = await ClassRegistrations.query().where('user_id', userId);
      classesOfUser.map((enrClass) => {
        return enrolledClassIdList.push(enrClass.class_id);
      });
      const onlyEnrolledClasses = _.filter(classes, (o) => {
        return enrolledClassIdList.indexOf(o.id) < 0;
      });
      return onlyEnrolledClasses;
    }
    return classes;
  }

  async createClass(newClass) {
    const { Classes } = this.server.models();
    return Classes.query().insert(newClass);
  }

  async deleteClass(classId) {
    const { Classes, ClassRegistrations } = this.server.models();
    await ClassRegistrations.query().delete().where('class_id', classId);
    const deleted = await Classes.query().delete().where('id', classId);
    if (deleted > 0) {
      return { success: true };
    }
    throw Boom.badRequest("Class doesn't exist");
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

  async recommendedClasses() {
    const { Classes } = this.server.models();
    return Classes.query().orderByRaw(`random()`).limit(4);
  }

  async registerToClassById(registrationDetails) {
    const { ClassRegistrations, Classes } = this.server.models();
    const { user_id, class_id } = registrationDetails;
    const isClassValid = await Classes.query().findById(class_id);
    const isAlreadyRegistered = await ClassRegistrations.query().findOne({
      user_id,
      class_id,
    });
    if (isClassValid.facilitator_id === user_id) {
      throw Boom.badRequest("You can't register to your own class");
    }
    if (isClassValid === undefined) {
      throw Boom.badRequest(`Class with class ID : ${class_id} doesn't exist`);
    } else if (isAlreadyRegistered !== undefined) {
      throw Boom.badRequest('Already registered to this class');
    }
    return ClassRegistrations.query().insert(registrationDetails);
  }

  async removeRegistrationById(classId, userId, txn) {
    const { ClassRegistrations } = this.server.models();
    const deletion = await ClassRegistrations.query(txn)
      .del()
      .where('user_id', userId)
      .andWhere('class_id', classId);
    if (deletion) return { success: true };
    throw Boom.badRequest('You are not registered to this class');
  }

  async getClassesByUserId(userId) {
    const { ClassRegistrations } = this.server.models();
    return ClassRegistrations.query().where('user_id', userId).orderBy('registered_at');
  }
};
