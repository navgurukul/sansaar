exports.up = async (knex, Promise) => {
    return knex.schema.createTable('main.pathway_partner_group',(table)=>{
        table.increments('id');
        table.integer('partner_id')
        .unsigned()
        .references('id')
        .inTable('main.partners')
        table.integer('pathway_id')
        .unsigned()
        .references('id')
        .inTable('main.pathways_v2')
    })
};

exports.down = async (knex, Promise) => {
    return knex.schema.dropTable('main.pathway_partner_group');
};
