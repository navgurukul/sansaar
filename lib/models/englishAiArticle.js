const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiArticle extends ModelBase {
  static get tableName() {
    return 'main.eng_articles';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      title: Joi.string().required(),
      source_url: Joi.string().required(),
      image_url: Joi.string(),
      created_at: Joi.date(),
      updated_at: Joi.date(),
    });
  }

  static get relationMappings() {
    const Article = require('./englishAiArticleLevelwise');
    return {
      article: {
        relation: Model.BelongsToOneRelation,
        modelClass: Article,
        join: {
          from: 'main.eng_articles.id',
          to: 'main.eng_levelwise.article_id',
        },
      },
    };
  }
};
