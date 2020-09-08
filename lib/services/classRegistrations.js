const Schmervice = require('schmervice');

module.exports = class ClassRegistrationsService extends Schmervice.Service {
  async registerToClassById(registrationDetails) {
    const { ClassRegistrations } = this.server.models();
    return ClassRegistrations.query().insert(registrationDetails);
  }

  async removeRegistrationById(classId, unregistrationDetails, txn) {
    const { ClassRegistrations } = this.server.models();
    const { id } = unregistrationDetails;
    return ClassRegistrations.query(txn).del().where('id', id).andWhere('class_id', classId);
  }

  async getClassesByUserId(userId) {
    const { ClassRegistrations } = this.server.models();
    return ClassRegistrations.query().where('user_id', userId).orderBy('registered_at');
  }
};
