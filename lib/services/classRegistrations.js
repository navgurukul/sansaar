const Schmervice = require('schmervice');

module.exports = class ClassRegistrationsService extends Schmervice.Service {
  async registerToClassById(payloadObj, txn) {
    const { ClassRegistration } = this.server.models();
    ClassRegistration.query(txn).insert(payloadObj);
  }

  async removeRegistrationById(payloadObj, txn) {
    const { ClassRegistration } = this.server.models();
    const { id, class_id } = payloadObj;
    ClassRegistration.query(txn).del().where('id', id).andWhere('class_id', class_id);
  }
};
