exports.up = async (knex) => {
  await knex.schema.createTable('main.c4ca_teachers', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.string('school');
    table.string('district');
    table.string('state');
    table.string('phone_number');
    table.string('email').notNullable();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('partner_id').references('id').inTable('main.partners').notNullable();

  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.c4ca_teachers');
};
