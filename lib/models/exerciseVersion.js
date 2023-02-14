const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ExerciseAddedAndDeletedVersion extends ModelBase {
  static get tableName() {
    return 'record_versions_of_post_delete_exercisedetails';
  }

  static get joiSchema() {
    return Joi.object({
      course_id: Joi.number().integer().greater(0),
      exercise_id: Joi.number().integer().greater(0),
      version: Joi.string(),
      addedOrRemoved: Joi.boolean(),
    });
  }
};
