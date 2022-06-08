exports.up = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.string('contact');
  });
  await knex.schema.createTable('main.volunteer', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users');
    table.integer('pathway_id').references('id').inTable('main.pathways_v2');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.users', (table) => {
    table.dropColumn('contact');
  });
  await knex.schema.dropTable('main.volunteer');
};
