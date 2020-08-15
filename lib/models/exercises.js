const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class Exercises extends ModelBase {
  static get tableName() {
    return 'main.exercises';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0).required(),
      parent_exercise_id: Joi.number().integer().greater(0),
      course_id: Joi.number().integer().greater(0).required(),
      name: Joi.string().max(300).required(),
      slug: Joi.string().max(100).required(),
      sequence_num: Joi.number().integer(),
      review_type: Joi.string(),
      content: Joi.string(),
      submission_type: Joi.string(),
      github_link: Joi.string(),
      solution: Joi.string(),
    });
  }
};
