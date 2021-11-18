exports.up = async (knex) => {
  await knex.schema.createTable('main.pathways_v2', (table) => {
    table.increments().primary();
    table.string('code', 6).unique().notNullable();
    table.string('name', 100).notNullable();
    table.string('logo');
    table.string('description', 5000).notNullable();
  });
  await knex.schema.createTable('main.courses_v2', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.string('logo');
    table.string('description');
    table.specificType('lang_available', 'TEXT[]');
  });
  await knex.schema.createTable('main.exercises_v2', (table) => {
    table.increments().primary();
    table.integer('parent_exercise_id');
    table.string('name').notNullable();
    table.string('description');
    table.integer('course_id').references('id').inTable('courses_v2');
    table.text('content');
    table.string('type');
    table.double('sequence_num');
  });
};

exports.down = async (knex) => {
  await knex.schema
    .dropTable('main.exercises_v2')
    .dropTable('main.courses_v2')
    .dropTable('main.pathways_v2');
};
