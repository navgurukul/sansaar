exports.up = async (knex) => {
  await knex.schema.createTable('record', (table) => {
    table.integer('course_id');
    table.integer('exercise_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('record ');
};

