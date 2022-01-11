exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_group', (table) => {
    table.increments().primary();
    table.string('name').unique().notNullable();
    table.boolean('base_group').notNullable();
    table.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_group');
};
