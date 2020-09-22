exports.up = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.dropColumn('sequence_num');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.integer('sequence_num');
  });
};
