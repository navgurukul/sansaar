exports.up = async (knex) => {
  await knex.schema.createTable('main.email_report', (table) => {
    table.increments();
    table
      .integer('partner_id')
      .unique()
      .unsigned()
      .references('id')
      .inTable('main.partners')
      .notNullable();
    table.string('report');
    table.boolean('status');
    table.specificType('emails', 'TEXT[]');
    table.string('repeat');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.email_report');
};
