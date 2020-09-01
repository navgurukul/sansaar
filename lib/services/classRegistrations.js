const Schmervice = require('schmervice');

module.exports = class ClassRegistrationsService extends Schmervice.Service {
  async registerToClassById(registrationDetails) {
    const { ClassRegistration } = this.server.models();
    ClassRegistration.query().insert(registrationDetails);
  }

  async removeRegistrationById(classId, unregistrationDetails, txn) {
    const { ClassRegistration } = this.server.models();
    const { id } = unregistrationDetails;
    ClassRegistration.query(txn).del().where('id', id).andWhere('class_id', classId);
  }
};
