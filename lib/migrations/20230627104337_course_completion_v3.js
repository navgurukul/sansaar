exports.up = async (knex) => {
  await knex.schema.createTable('main.course_completion_v3', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('course_id').notNullable();
    table.timestamp('complete_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.course_completion_v3');
};
