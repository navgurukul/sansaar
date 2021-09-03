exports.up = async (knex) => {
  await knex.schema.createTable('main.classes_mail', (table) => {
    table.increments();
    table.integer('class_id').references('id').inTable('classes');
    table.string('facilitator_email', 80).notNullable();
    table.string('status', 50);
    table.string('type', 255).notNullable();
  });
};
exports.down = async (knex) => {
  await knex.schema.dropTable('main.classes_mail');
};
