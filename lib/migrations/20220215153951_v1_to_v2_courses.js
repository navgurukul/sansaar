exports.up = async (knex) => {
  await knex.schema.createTable('main.classes_to_courses', (table) => {
    table.increments().primary();
    table.integer('class_id').references('id').inTable('main.classes');
    table.integer('pathway_v1').references('id').inTable('main.pathways');
    table.integer('course_v1').references('id').inTable('main.courses');
    table.integer('exercise_v1').references('id').inTable('main.exercises');
    table.integer('pathway_v2').references('id').inTable('main.pathways_v2');
    table.integer('course_v2').references('id').inTable('main.courses_v2');
    table.integer('exercise_v2').references('id').inTable('main.exercises_v2');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.classes_to_courses');
};
