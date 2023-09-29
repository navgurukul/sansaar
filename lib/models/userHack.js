const Joi = require('@hapi/joi');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

module.exports = class UserHack extends ModelBase {
  static get tableName() {
    return 'main.user_hack';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      email: Joi.string().email(),
      name: Joi.string(),
    })
}

static get relationMappings() {
  const Session = require('./session');
  const ViewPage = require('./viewPage');
  const Events = require('./events');
  /* eslint-enable */
  return {
    sessionsData: {
      relation: Model.HasManyRelation,
      modelClass: Session,
      join: {
        from: 'main.user_hack.id',
        to: 'main.session.user_id',
      },
    },

    viewPageData: {
      relation: Model.HasManyRelation,
      modelClass: ViewPage,
      join: {
        from: 'main.user_hack.id',
        to: 'main.view_page.user_id',
      },
    },

    eventsData: {
      relation: Model.HasManyRelation,
      modelClass: Events,
      join: {
        from: 'main.user_hack.id',
        to: 'main.events.user_id',
      },
    },
  };
}


}