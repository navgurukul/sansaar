exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('meet_link').alter();
    table.string('title').alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('meet_link', 12).alter();
    table.string('title', 45).alter();
  });
};
