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
    table.string('name').notNullable().unique();
    table.string('logo');
    table.string('short_description');
    table.specificType('lang_available', 'TEXT[]');
  });
  await knex.schema.createTable('main.exercises_v2', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.string('description');
    table.integer('course_id').references('id').inTable('courses_v2');
    table.text('content');
    table.string('type');
    table.double('sequence_num');
  });
  await knex.schema.createTable('main.pathway_courses_v2', (table) => {
    table.increments().primary();
    table.integer('course_id').unsigned().references('id').inTable('main.courses_v2').notNullable();
    table
      .integer('pathway_id')
      .unsigned()
      .references('id')
      .inTable('main.pathways_v2')
      .notNullable();
  });
  await knex.schema.createTable('main.pathway_completion_v2', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table
      .integer('pathway_id')
      .unsigned()
      .references('id')
      .inTable('main.pathways_v2')
      .notNullable()
      .unique();
  });
  await knex.schema.createTable('main.course_completion_v2', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table
      .integer('course_id')
      .unsigned()
      .references('id')
      .inTable('main.courses_v2')
      .notNullable()
      .unique();
  });
  await knex.schema.createTable('main.exercise_completion_v2', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table
      .integer('exercise_id')
      .unsigned()
      .references('id')
      .inTable('main.exercises_v2')
      .notNullable()
      .unique();
  });
};

exports.down = async (knex) => {
  await knex.schema
    .dropTable('main.pathway_courses_v2')
    .dropTable('main.pathway_completion_v2')
    .dropTable('main.course_completion_v2')
    .dropTable('main.exercise_completion_v2')
    .dropTable('main.exercises_v2')
    .dropTable('main.courses_v2')
    .dropTable('main.pathways_v2');
};
