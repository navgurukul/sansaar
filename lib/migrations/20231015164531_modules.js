exports.up = async (knex, Promise) => {
  await knex.schema.createTable('main.module_completion_v2', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('main.users').nullable();
    table.integer('module_id').notNullable();
    table.timestamp('complete_at');
    table
      .integer('team_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('main.c4ca_teams')
      .onDelete('set null');
    table.integer('percentage');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.dropTable('main.module_completion_v2');
};
