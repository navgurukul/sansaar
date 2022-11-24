exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('volunteer_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('volunteer_id');
  });
};
