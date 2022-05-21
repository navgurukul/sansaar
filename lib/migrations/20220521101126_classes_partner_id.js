exports.up = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.integer('partner_id').unsigned().references('id').inTable('main.partners').nullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.classes', (table) => {
    table.dropColumn('partner_id');
  });
};
