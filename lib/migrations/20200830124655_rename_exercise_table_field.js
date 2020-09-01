exports.up = async (knex) => {
  await knex.schema.alterTable('main.exercises', (table) => {
    table.string('name', 500).notNullable().alter();
    table.string('slug', 500).notNullable().alter();
    table.string('github_link', 500).nullable().alter();
  });
};

exports.down = async (knex, Promise) => {};
