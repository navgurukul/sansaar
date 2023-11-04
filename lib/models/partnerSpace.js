const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class PartnerSpace extends ModelBase {
  static get tableName() {
    return 'main.partner_space';
  }

  static get joiSchema() {
    return Joi.object({
        id: Joi.number().integer().greater(0),
        partner_id: Joi.number().integer().greater(0),
        space_name: Joi.string().required(),
        point_of_contact_name:Joi.string(),
        email: Joi.string().email().allow(null),
    });
  }
  static get relationMappings() {
        const SpaceGroup = require('./spaceGroup');
        /* eslint-enable */
        return {
          space_groups: {
                relation: Model.HasManyRelation,
                modelClass: SpaceGroup,
                join: {
                  from: 'main.partner_space.id',
                  to: 'main.space_group.space_id',
                },
            },
        };
    };
}