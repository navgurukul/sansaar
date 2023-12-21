const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class HackathonCourses extends ModelBase {
    static get tableName() {
        return 'main.hackathon_courses';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            email: Joi.string().email().required(),
            course_id: Joi.number().integer().required(),
            exercise_id: Joi.number().integer().allow(null),
            progress: Joi.string().allow(null),
        });
    }
}
