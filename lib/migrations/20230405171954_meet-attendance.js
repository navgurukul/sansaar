exports.up = async (knex) => {
  await knex.schema.createTable('main.meet_attendance', (table) => {
    table.increments('id').primary();
    table.string('attendies_data');
    table.timestamp('meeting_date').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.meet_attendance'); // user_search
};
