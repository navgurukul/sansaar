exports.up = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.specificType('lang', 'char(2)').notNullable().defaultTo('hi');
  });

  await knex.schema.createTable('main.class_registrations', (table) => {
    table.increments().primary();
    table.integer('class_id').references('id').inTable('main.classes').notNullable();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.datetime('registered_at').notNullable();
    table.string('feedback', 255);
    table.datetime('feedback_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('main.classes', (table) => {
    table.dropColumn('lang');
  });
  await knex.schema.dropTable('main.class_registrations');
};
