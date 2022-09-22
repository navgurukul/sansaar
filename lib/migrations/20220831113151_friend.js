exports.up = async (knex, Promise) => {
    await knex.schema.createTable('friend', (table) => {
        table.increments().primary();
        table.string('user_id');
    })
};

exports.down = async (knex, Promise) => {
    await knex.schema.dropTable('friend')
};
