exports.up = async (knex) => {
  await knex.schema.createTable('exerciseAddedAndDeletedInVersion', (table) => {
    table.increments().primary();
    table.integer('Course_id').references('id').inTable('main.courses_v2');
    table.integer('exercise_id');
    table.string('version');
    table.string('updated');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('exerciseAddedAndDeletedInVersion');
};
