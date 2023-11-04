exports.up = async (knex) => {
  await knex.schema.createTable('main.facilitators', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.string('point_of_contact');
    table.string('email').notNullable();
    table.string('web_link').notNullable();
    table.string('phone_number').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.facilitators');
};
