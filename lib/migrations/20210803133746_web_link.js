exports.up = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.string('web_link');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.partners', (table) => {
    table.dropColumn('web_link');
  });
};
