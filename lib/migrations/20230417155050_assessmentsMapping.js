exports.up = async (knex) => {
  await knex.schema.createTable('main.assessment_outcome', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('assessment_id').notNullable();
    table.string('status').notNullable();
    table.integer('selected_option').notNullable();
    table.integer('attempt_count').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.assessment_outcome');
};
