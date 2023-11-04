exports.up = async (knex) => {
    await knex.schema.alterTable('main.partner_specific_batches', (table) => {
        table.integer('pathway_id');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.partner_specific_batches', (table) => {
        table.dropColumn('pathway_id');
    });
};
