/* eslint-disable global-require */
const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class YoutubeBroadcast extends ModelBase {
  static get tableName() {
    return 'main.youtube_broadcast';
  }

  static get joiSchema() {
    return Joi.object({
        id: Joi.number().integer().greater(0),
        video_id: Joi.string().required(),
        class_id: Joi.number().integer().greater(0),
        recurring_id: Joi.number().integer().greater(0).allow(null),
    });
  }
};
