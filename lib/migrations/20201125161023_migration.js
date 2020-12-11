// const { onCoursesTrigger } = require('../dbTriggers');
exports.up = async (knex) => {
  await knex.schema.createTable('main.exercise_completion', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('exercise_id').references('id').inTable('main.exercises').notNullable();
    table.unique(['user_id', 'exercise_id']);
  });

  await knex.schema.createTable('main.course_completion', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('course_id').unsigned().references('id').inTable('main.courses').notNullable();
    table.unique(['user_id', 'course_id']);
  });

  await knex.schema.createTable('main.pathway_completion', (table) => {
    table.increments().primary();
    table.integer('user_id').unsigned().references('id').inTable('main.users').notNullable();
    table.integer('pathway_id').unsigned().references('id').inTable('main.pathways').notNullable();
    table.unique(['user_id', 'pathway_id']);
  });

  await knex.schema.alterTable('main.classes', (table) => {
    table.string('material_link');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.exercise_completion');
  await knex.schema.dropTable('main.course_completion');
  await knex.schema.dropTable('main.pathway_completion');
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('material_link');
  });
};
