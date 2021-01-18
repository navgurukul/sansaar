const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Submissions extends ModelBase {
  static get tableName() {
    return 'main.submissions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      exercise_id: Joi.number().integer().greater(0).required(),
      user_id: Joi.number().integer().greater(0).required(),
      submitted_at: Joi.date().timestamp().required(),
      submitter_notes: Joi.string().max(300),
      files: Joi.string().max(1000),
      peer_reviewer_id: Joi.number().integer().greater(0),
      notes_reviewer: Joi.string().max(300),
      reviewed_at: Joi.date().timestamp(),
      state: Joi.string(),
      completed: Joi.boolean(),
      completed_at: Joi.date().timestamp(),
      mark_completed_by: Joi.number().integer().greater(0),
    });
  }
};
