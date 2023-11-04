exports.up = async (knex) => {
    await knex.schema.alterTable('main.partner_specific_batches', (table) => {
        table.integer('pathway_id').references('id').inTable('main.pathways_v2');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.partner_specific_batches', (table) => {
        table.dropColumn('pathway_id');
    });
};
