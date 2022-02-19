exports.up = async (knex, Promise) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('course_id');
    table.dropColumn('exercise_id');
    table.dropColumn('pathway_id');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('course_id').references('id').inTable('courses');
    table.integer('exercise_id').references('id').inTable('exercises');
    table.integer('pathway_id').references('id').inTable('pathways');
  });
};
