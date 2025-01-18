const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

// career manager model
module.exports = class ClusterManager extends ModelBase {
  static get tableName() {
    return 'main.cluster_managers';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      name: Joi.string().min(3).max(100).required(),
      point_of_contact: Joi.string().min(3).max(100),
      email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
      web_link: Joi.string().uri().allow(null),
      phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/), // E.164 international phone number format
      created_at: Joi.date(),
      updated_at: Joi.date()
    });
  }

  static get relationMappings() {
    const CareerTeacher = require('./careerTeachers');
    return {
      career_teachers: {
        relation: Model.HasManyRelation,
        modelClass: CareerTeacher,
        join: {
          from: 'main.cluster_managers.id',
          to: 'main.career_teachers.cluster_manager_id',
        },
      },
    };
  }
};
