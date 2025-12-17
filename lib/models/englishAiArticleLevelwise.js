const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiArticleLevelwise extends ModelBase {
  static get tableName() {
    return 'main.eng_levelwise';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      level: Joi.number().integer().required(),
      content: Joi.string().allow(null),
      article_id: Joi.number().integer().required(),
      created_at: Joi.date(),
      updated_at: Joi.date(),
    });
  }

  // static get relationMappings() {
  //   const Article = require('./englishAiArticle');
  //   return {
  //     student: {
  //       relation: Model.BelongsToOneRelation,
  //       modelClass: Article,
  //       join: {
  //         from: 'main.eng_articles.id',
  //         to: 'main.eng_levelwise.articles_id',
  //       },
  //     },
  //   };
  // }
};
