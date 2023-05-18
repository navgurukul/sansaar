const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class MeetAttendance extends ModelBase {
  static get tableName() {
    return 'main.meet_attendance';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      attendies_data: Joi.string().required(),
      meeting_date: Joi.date(),
    });
  }
};
