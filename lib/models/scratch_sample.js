/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class ScratchSample extends ModelBase {
    static get tableName() {
        return 'main.scratch_sample';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            project_id: Joi.string().required(),
            url: Joi.string().required(),
            project_name: Joi.string(),
            created_at: Joi.date(),
        });
    }

    $beforeInsert() {
        const now = new Date();
        this.created_at = now;
    }
};