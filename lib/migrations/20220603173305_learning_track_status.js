exports.up = async (knex) => {
  await knex.schema.createTable('main.learning_track_status', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users');
    table.integer('pathway_id');
    table.integer('course_id');
    table.integer('course_index');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.learning_track_status');
};
