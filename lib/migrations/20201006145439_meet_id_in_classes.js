exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('meet_link', 12);
    table.string('calendar_event_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('meet_link');
    table.dropColumn('calendar_event_id');
  });
};
