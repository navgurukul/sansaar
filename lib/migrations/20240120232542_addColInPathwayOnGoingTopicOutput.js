exports.up = async (knex) => {
    await knex.schema.alterTable('main.pathways_ongoing_topic_outcome', (table) => {
        table.integer('slug_id');
        table.string('type');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.pathways_ongoing_topic_outcome', (table) => {
        table.dropColumn('slug_id');
        table.dropColumn('type');
        table.dropColumn('created_at');
        table.dropColumn('updated_at');
    });
};
