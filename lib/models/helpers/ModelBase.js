const Schwifty = require('schwifty');
const { DbErrors } = require('objection-db-errors');
const _ = require('lodash');

class ModelBase extends DbErrors(Schwifty.Model) {
  static createNotFoundError(ctx) {
    const error = super.createNotFoundError(ctx);
    return Object.assign(error, {
      modelName: this.name,
    });
  }

  static field(name) {
    return this.getJoiSchema().extract(name).optional().options({ noDefaults: true });
  }

  static fields() {
    return _.keys(this.getJoiSchema().describe().keys);
  }

  async $beforeInsert() {
    if (this.constructor.fields().indexOf('created_at') > -1) {
      const now = new Date();
      this.created_at = now;
    }
  }
}

module.exports = ModelBase;
