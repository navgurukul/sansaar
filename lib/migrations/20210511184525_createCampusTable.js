exports.up = async (knex) => {
  await knex.schema.createTable('main.campus', (table) => {
    table.increments();
    table.integer('student_id').references('id').inTable('main.students');
    table.string('campus', 225);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.campus');
};
