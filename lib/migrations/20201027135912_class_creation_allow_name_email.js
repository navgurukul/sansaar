exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('facilitator_name', 80);
    table.string('facilitator_email', 120);
    table.integer('facilitator_id').unsigned().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.dropColumn('facilitator_name');
    table.dropColumn('facilitator_email');
    table.integer('facilitator_id').unsigned().notNullable().alter();
  });
};
