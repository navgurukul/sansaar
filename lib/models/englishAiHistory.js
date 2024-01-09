const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiHistory extends ModelBase {
  static get tableName() {
    return 'main.eng_history';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().greater(0).required(),
      english_ai_id: Joi.number().integer().greater(0).required(),
      createdAt: Joi.date(),
    });
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./user');
    // eslint-disable-next-line global-require
    const englishAiContent = require('./englishAiArticle');
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'main.eng_history.user_id',
          to: 'main.users.id',
        },
      },
      englishAiContent: {
        relation: Model.BelongsToOneRelation,
        modelClass: englishAiContent,
        join: {
          from: 'main.eng_history.english_ai_id',
          to: 'main.eng_articles.id',
        },
      },
    };
  }
};
