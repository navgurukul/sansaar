/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class TeacherCapacityBuilding extends ModelBase {
  static get tableName() {
    return 'main.teacher_capacity_building';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      zone: Joi.string(),
      school_id: Joi.number().integer(),
      school_name: Joi.string(),
      teacher_name: Joi.string(),
      teacher_id: Joi.number().integer(),
      class_of_teacher: Joi.string(),
      email: Joi.string().email(),
      user_id: Joi.number().integer().required(),
      phone_number: Joi.string()
      .min(7)
      .max(15)
      .pattern(/^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/)
      .required()
    });
  }

};
