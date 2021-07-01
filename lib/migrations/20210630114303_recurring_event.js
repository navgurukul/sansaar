exports.up = async (knex) => {
  await knex.schema.createTable('main.recurring_classes', (table) => {
    table.increments();
    table.string('frequency').notNullable();
    table.integer('occurrence');
    table.date('until');
    table.string('on_days');
    table.string('calendar_event_id');
  });
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('recurring_id').references('id').inTable('recurring_classes');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.dropColumn('recurring_id');
  });
  await knex.schema.dropTable('main.recurring_classes');
};
