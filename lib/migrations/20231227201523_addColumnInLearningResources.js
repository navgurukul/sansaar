exports.up = async (knex) => {
    await knex.schema.alterTable('main.learning_resources', function (table) {
        table.integer('developers_id').unsigned().references('id').inTable('main.developers_resume').nullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.learning_resources', function (table) {
        table.dropColumn('developers_id'); 
    });
};
