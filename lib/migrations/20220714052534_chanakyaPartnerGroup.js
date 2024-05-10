exports.up = async (knex) => {
  await knex.schema.createTable('main.chanakya_partner_group', (table) => {
    table.increments();
    table.string('name');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.chanakya_partner_group');
};
