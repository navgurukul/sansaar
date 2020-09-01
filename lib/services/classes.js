const Schmervice = require('schmervice');

module.exports = class ClassesService extends Schmervice.Service {
  async getClasses() {
    const { Classes } = this.server.models();
    const classes = await Classes.query();
    return classes;
  }

  async createClass(newClass, txn) {
    const { Classes } = this.server.models();
    return Classes.query(txn).insert(newClass);
  }

  async updateClass(id, classUpdates, txn) {
    const { Classes } = this.server.models();
    let updatedClass = null;
    updatedClass = await Classes.query(txn).update(classUpdates).where('id', id);
    return updatedClass;
  }
};
