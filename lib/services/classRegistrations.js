const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');

module.exports = class ClassRegistrationsService extends Schmervice.Service {
  async registerToClassById(registrationDetails) {
    const { ClassRegistrations, Classes } = this.server.models();
    const { user_id, class_id } = registrationDetails;
    const checkIfClassValid = await Classes.query().findById(class_id);
    const checkIfRegistered = await ClassRegistrations.query().findOne({
      user_id,
      class_id,
    });
    if (checkIfClassValid === undefined) {
      throw Boom.badRequest(`Class with class ID : ${class_id} doesn't exist`);
    } else if (checkIfRegistered !== undefined) {
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
    console.log(userId);
    const { ClassRegistrations } = this.server.models();
    const C = await ClassRegistrations.query().where('user_id', userId).orderBy('registered_at');
    console.log(C);
    return C;
  }
};
