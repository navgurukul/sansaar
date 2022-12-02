exports.up = async (knex) => {
  await knex.schema.createTable('main.scratch', (table) => {
    table.increments('id').primary();
    table.string('project_id').unique();
    table.string('url').notNullable();
  });
};
exports.down = async (knex) => {
  await knex.schema.dropTable('main.scratch');
};
