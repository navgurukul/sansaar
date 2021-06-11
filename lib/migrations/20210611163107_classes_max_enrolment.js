exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.integer('max_enrolment');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('max_enrolment');
  });
};
