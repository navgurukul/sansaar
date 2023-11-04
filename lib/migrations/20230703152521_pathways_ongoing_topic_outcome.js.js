exports.up = async (knex) => {
    await knex.schema.createTable('main.pathways_ongoing_topic_outcome', (table) => {
      table.increments().primary();
      table.integer('user_id').references('id').inTable('main.users');
      table.integer('pathway_id');
      table.integer('course_id');
      table.integer('exercise_id');
      table.integer('assessment_id');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.pathways_ongoing_topic_outcome');
  };
  