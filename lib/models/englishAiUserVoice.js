const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiUsersVoiceRecognise extends ModelBase {
  static get tableName() {
    return 'main.english_ai_users_voice_recognise';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      users_reading: Joi.string().required(),
      wrong_words_pronounced: Joi.string(),
      level: Joi.number().integer().required(),
      user_id: Joi.number().integer().required(),
      english_ai_content_id: Joi.number().integer().required(),
    });
  }

  static get relationMappings() {
    const User = require('./user');
    const EnglishAiContent = require('./englishAiContent');
    return {
      users: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.english_ai_users_voice_recognise.user_id',
          to: 'main.users.id',
        },
      },
      englishAiContent: {
        relation: Model.BelongsToOneRelation,
        modelClass: EnglishAiContent,
        join: {
          from: 'main.english_ai_users_voice_recognise.english_ai_content_id',
          to: 'main.english_ai_content.id',
        },
      },
    };
  }
};
