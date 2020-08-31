exports.up = async (knex) => {
  await knex.schema.table('main.pathways', (table) => {
    table.boolean('tracking_enabled').after('description').notNullable().defaultTo(false);
    table.string('tracking_frequency').after('tracking_enabled').unsigned();
    table.integer('tracking_day_of_week').after('tracking_frequency').unsigned();
    table.integer('tracking_days_lock_before_cycle').after('tracking_day_of_week').unsigned();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.pathways', (table) => {
    table
      .dropColumn('tracking_enabled')
      .dropColumn('tracking_frequency')
      .dropColumn('tracking_day_of_week')
      .dropColumn('tracking_days_lock_before_cycle');
  });
};
