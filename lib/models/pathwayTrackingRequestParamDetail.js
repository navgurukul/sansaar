const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayTrackingRequestParamDetail extends ModelBase {
  static get tableName() {
    return 'main.main.pathway_tracking_request_parameter_details';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      parameter_id: Joi.number().integer().greater(0).required(),
      data: Joi.number().integer().required(),
      created_at: Joi.date(),
    });
  }
};
