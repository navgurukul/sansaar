exports.up = async (knex) => {
  await knex.schema.createTable('main.partner_specific_batches', (table) => {
    table.increments().primary();
    table.integer('class_id').unsigned().references('id').inTable('main.classes').nullable();
    table
      .integer('recurring_id')
      .unsigned()
      .references('id')
      .inTable('main.recurring_classes')
      .nullable();
    table.integer('partner_id').unsigned().references('id').inTable('main.partners');
  });
};
exports.down = async (knex) => {
  await knex.schema.dropTable('main.partner_specific_batches');
};
