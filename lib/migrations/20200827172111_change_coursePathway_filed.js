exports.up = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.datetime('updated_at').nullable().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.datetime('updated_at').notNullable().alter();
  });
};
