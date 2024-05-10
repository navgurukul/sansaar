exports.up = async (knex) => {
  await knex.schema.alterTable('main.questions', (table) => {
    table.string('ma_text', 2000);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.questions', (table) => {
    table.dropColumn('ma_text');
  });
};
