exports.up = async (knex) => {
  await knex.schema.alterTable('main.assessment_result', (table) => {
    table.integer('attempt_count').notNullable().default(1);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.assessment_result', (table) => {
    table.dropColumn('attempt_count');
  });
};
