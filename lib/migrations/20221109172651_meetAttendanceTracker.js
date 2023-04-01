exports.up = async (knex) => {
    await knex.schema.createTable('main.meet_attendance_tracker', (table) => {
      table.increments().primary();
      table.string('meeting_title');
      table.string('attendee_names');
      table.string('attendedDurationInSec');
      table.string('meet_code');
      table.datetime('meeting_time').notNullable();
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.meet_attendance_tracker');
  };