exports.up = async (knex) => {
  await knex.schema.withSchema('main').renameTable('donor', 'student_donor');
  await knex.schema.createTable('main.donor', (table) => {
    table.increments();
    table.string('donor', 225);
  });
  await knex.schema.alterTable('main.student_donor', (table) => {
    table.dropColumn('donor');
    table.specificType('donor_id', 'TEXT[]');
  });
};
exports.down = async (knex) => {
  await knex.schema.alterTable('main.student_donor', (table) => {
    table.dropColumn('donor_id');
    table.string('donor');
  });
  await knex.schema.dropTable('main.donor');
  await knex.schema.withSchema('main').renameTable('student_donor', 'donor');
};
