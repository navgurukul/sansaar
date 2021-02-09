const { knexSnakeCaseMappers } = require('objection');

exports.up = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.unique(['user_id', 'class_id']);
  });
  await knex.schema.alterTable('main.course_enrolments', (table) => {
    table.unique(['student_id', 'course_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.dropUnique(['user_id', 'class_id']);
  });
  await knex.schema.alterTable('main.course_enrolments', (table) => {
    table.dropUnique(['student_id', 'course_id']);
  });
};
