exports.up = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
        table.integer('slug_id');
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.classes_to_courses', (table) => {
        table.dropColumn('slug_id');
    });
};
