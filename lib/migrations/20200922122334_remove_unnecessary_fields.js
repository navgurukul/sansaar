exports.up = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.dropColumn('sequence_num');
  });
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.string('feedback', 1000).alter();
  });
  await knex.schema.alterTable('main.classes', (table) => {
    table.renameColumn('class_type', 'type');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.courses', (table) => {
    table.integer('sequence_num');
  });
  await knex.schema.alterTable('main.class_registrations', (table) => {
    table.string('feedback', 255).alter();
  });
  await knex.schema.alterTable('main.classes', (table) => {
    table.renameColumn('type', 'class_type');
  });
};
