exports.up = async (knex) => {
  await knex.schema.table('main.partners', (table) => {
    table.text('description');
    table.text('logo');
    table.text('website_link');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.partners', (table) => {
    table.dropColumn('description');
    table.dropColumn('logo');
    table.dropColumn('website_link');
  });
};
