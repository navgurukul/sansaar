const Schwifty = require('schwifty');
const { DbErrors } = require('objection-db-errors');
const _ = require('underscore');

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
    return _.keys(this.getJoiSchema().describe().children);
  }
}

module.exports = ModelBase;
