exports.up = async (knex) => {
  await knex.schema.createTable('main.slot_booked', (table) => {
    table.increments();
    table.integer('interview_slot_id').references('id').inTable('main.interview_slot');
    table.integer('student_id').references('id').inTable('main.students');
    table.date('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.slot_booked');
};
