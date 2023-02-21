const Joi = require('@hapi/joi');
const {Model} = require('objection')
const ModelBase = require('./helpers/ModelBase');
const { relationMappings } = require('./pathwayMilestone');

module.exports = class Teacher_registration extends ModelBase{
    static get tableName(){
        return "main.teacher_registration"
    }
    static get joiSchema(){
        return Joi.object({
            id: Joi.number().integer().greater(0),
            name: Joi.string(),
            email: Joi.email(),
            contact_no: Joi.integer(),
            // partner_id: Joi.integer()
        })
    }
    
    // static get relationMappings(){
    //     const Partner = require('./partner');
    //     return {
    //         Partner:{
    //             relation:Model.HasOneRelation,
    //             modelClass: Partner,
    //             join:{
    //                 from:"main.teacher_registration.partner_id",
    //                 to: 'main.partners.id'
    //             }
    //         }
    //     }
    // }
    async $beforeInsert() {
        const now = new Date();
        this.created_at = now;
      }
};