const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class SpaceGroup extends ModelBase {
  static get tableName() {
    return 'main.space_group';
  }

  static get joiSchema() {
    return Joi.object({
        id: Joi.number().integer().greater(0),
        space_id: Joi.number().integer().greater(0),
        group_name: Joi.string().required(),
    });
  }
  static get relationMappings() {
        const PartnerSpace = require('./partnerSpace');
        /* eslint-enable */
        return {
          partner: {
                relation: Model.HasManyRelation,
                modelClass: PartnerSpace,
                join: {
                  from: 'main.partner_space.id',
                  to: 'main.space_group.space_id',
                },
            },
        };
    };
}