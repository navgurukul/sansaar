const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserPopularSearch extends ModelBase {
  static get tableName() {
    return 'main.users_popular_search';
  }
  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      course_name: Joi.string().required(),
      count: Joi.number().integer().required(),
    });
  }
  // static get relationMappings() {
  //   const UserSearch = require('./userSearch');
  //   return {
  //     UserSearch: {
  //       relation: Model.BelongsToOneRelation,
  //       modelClass: UserSearch,
  //       join: {
  //         from: 'main.users_search.name',
  //         to: 'main.users_popular_search.course_name',
  //       },
  //     },
  //   };
  // }
}