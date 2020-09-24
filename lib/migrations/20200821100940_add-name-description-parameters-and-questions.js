exports.up = async (knex) => {
  await knex.schema.table('main.progress_parameters', (table) => {
    table.string('name', 20).after('type').notNullable();
    table.string('description', 5000).after('name').notNullable();
  });
  await knex.schema.table('main.progress_questions', (table) => {
    table.string('name', 20).after('type').notNullable();
    table.string('description', 5000).after('name').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.progress_parameters', (table) => {
    table.dropColumn('name');
    table.dropColumn('description');
  });
  await knex.schema.table('main.progress_questions', (table) => {
    table.dropColumn('name');
    table.dropColumn('description');
  });
};
