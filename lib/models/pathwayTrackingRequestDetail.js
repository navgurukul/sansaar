const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayTrackingRequestsDetails extends ModelBase {
  static get tableName() {
    return 'main.pathway_tracking_request_details';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      pathway_id: Joi.number().integer().greater(0).required(),
      mentor_id: Joi.number().integer().greater(0).required(),
      mentee_id: Joi.number().integer().greater(0).required(),
      request_id: Joi.number().integer().greater(0).required(),
      created_at: Joi.date(),
    });
  }
};
