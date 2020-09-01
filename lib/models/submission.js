const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Submission extends ModelBase {
  static get tableName() {
    return 'main.submissions';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      exercise_id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      submitted_at: Joi.date(),
      submitter_notes: Joi.string(),
      files: Joi.string(),
      peer_reviewer_id: Joi.number().integer().greater(0),
      notes_reviewer: Joi.string(),
      reviewed_at: Joi.date(),
      state: Joi.string(),
      completed: Joi.boolean(),
      completed_at: Joi.date(),
      mark_completed_by: Joi.date(),
    });
  }
};
