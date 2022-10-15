exports.up = async (knex) => {
  await knex.schema.createTable('main.pathways_ongoing_topic', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('pathway_id').references('id').inTable('main.pathways_v2').notNullable();
    table.integer('course_id').references('id').inTable('main.courses_v2').notNullable();
    table.integer('exercise_id').references('id').inTable('main.exercises_v2').nullable();
    table.integer('assessment_id').references('id').inTable('main.assessment').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.pathways_ongoing_topic');
};
