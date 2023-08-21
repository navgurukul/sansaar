const { Model } = require('objection');
const Joi = require('@hapi/joi');
const ModelBase = require('./helpers/ModelBase');

module.exports = class EnglishAiHistory extends ModelBase {
    static get tableName() {
        return 'main.english_ai_history';
    }

    static get joiSchema() {
        return Joi.object({
            id: Joi.number().integer().greater(0),
            user_id: Joi.number().integer().required(),
            english_ai_id: Joi.number().integer().required(),
            created_at: Joi.date()
        });
    }

    static get relationMappings() {
        // eslint-disable-next-line global-require
        const User = require('./user');
        // eslint-disable-next-line global-require
        const englishAiContent = require('./englishAiContent');
        return {
            user: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'main.english_ai_history.user_id',
                    to: 'main.users.id',
                },
            },
            englishAiContent: {
                relation: Model.BelongsToOneRelation,
                modelClass: englishAiContent,
                join: {
                    from: 'main.english_ai_history.english_ai_id',
                    to: 'main.english_ai_content.id',
                },
            },
        };
    }
};
