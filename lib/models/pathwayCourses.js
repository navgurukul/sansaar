const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PathwayCourses extends ModelBase {
  static get tableName() {
    return 'main.pathway_courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer(),
      courseId: Joi.number().integer().greater(0),
      pathwayId: Joi.number().integer().greater(0),
      sequenceNum: Joi.number().integer().greater(0),
      createdAt: Joi.date(),
      updatedAt: Joi.date(),
    });
  }
};
