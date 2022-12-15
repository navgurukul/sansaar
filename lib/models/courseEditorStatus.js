const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseEditorStatus extends ModelBase {
  static get tableName() {
    return 'main.course_editor_status';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_id: Joi.number().integer().greater(0),
      course_states: Joi.string(),
      stateChangedate: Joi.date(),
      content_editors_user_id: Joi.number().integer(),
    });
  }
};
