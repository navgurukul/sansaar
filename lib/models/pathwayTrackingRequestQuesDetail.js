const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayTrackingRequestQuesDetail extends ModelBase {
  static get tableName() {
    return 'main.pathway_tracking_request_question_details';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      question_id: Joi.number().integer().greater(0).required(),
      data: Joi.string().required(),
      created_at: Joi.date(),
    });
  }
};
