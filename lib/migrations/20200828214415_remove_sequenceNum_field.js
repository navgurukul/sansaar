exports.up = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.dropColumn('sequence_num');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.pathway_courses', (table) => {
    table.integer('sequence_num').unsigned().notNullable();
  });
};
