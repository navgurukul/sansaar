const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class AttendanceTracker extends ModelBase {
  static get tableName() {
    return 'main.meet_attendance_tracker';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      attendee_names: Joi.string().required(),
      attendedDurationInSec: Joi.string().required(),
      meet_code: Joi.string().required(),
      meeting_time: Joi.string().required(),
      meeting_title: Joi.string().required(),
    });
  }
};
