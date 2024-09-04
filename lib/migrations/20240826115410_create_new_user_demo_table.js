exports.up = async (knex) => {
    await knex.schema.createTable('newUserDemo', (table) => {
        table.increments('id').primary();  // Auto-incrementing 'id'
        table.string('name', 100).notNullable();
        table.string('email', 100).notNullable();
        table.string('contact', 20).notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTableIfExists('newUserDemo');
};


