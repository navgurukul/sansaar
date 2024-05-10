exports.up = async (knex) => {
  await knex.schema.alterTable('main.students', (table) => {
    table.string('other_activities');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.students', (table) => {
    table.dropColumn('other_activities');
  });
};
