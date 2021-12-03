const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ExercisesV2 extends ModelBase {
  static get tableName() {
    return 'main.exercises_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().max(100).required(),
      description: Joi.string(),
      course_id: Joi.number().integer().greater(0).required(),
      content: Joi.string(),
      type: Joi.string(),
      sequence_num: Joi.number().integer(),
    });
  }

  static async findByCourseId(courseId) {
    const exercise = await this.query().where('course_id', courseId);
    return exercise;
  }
};
