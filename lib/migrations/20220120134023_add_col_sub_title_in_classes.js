exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('sub_title');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('sub_title');
  });
};
