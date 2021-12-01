exports.up = async (knex) => {
  await knex.schema.alterTable('main.recurring_classes', (table) => {
    table.string('cohort_room_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.recurring_classes', (table) => {
    table.dropColumn('cohort_room_id');
  });
};
