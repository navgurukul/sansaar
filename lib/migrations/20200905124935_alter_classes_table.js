exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.string('class_type').after('title').notNullable();
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('class_type');
  });
};
