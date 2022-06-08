exports.up = async (knex) => {
  await knex.schema.createTable('main.assessment', (table) => {
    table.increments().primary();
    table.string('name').unique().notNullable();
    table.text('content');
    table.integer('course_id').references('id').inTable('main.courses_v2');
    table.integer('exercise_id').references('id').inTable('main.exercises_v2');
  });
  await knex.schema.createTable('main.assessment_result', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('assessment_id').references('id').inTable('main.assessment').notNullable();
    table.string('status').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.assessment_result').dropTable('main.assessment');
};
