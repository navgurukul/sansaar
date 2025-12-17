exports.up = async (knex) => {
  await knex.schema.createTable('main.eng_history', (table) => {
    table.increments().primary();
    table.integer('user_id').references('id').inTable('main.users').notNullable();
    table.integer('eng_articles_id').references('id').inTable('main.eng_articles').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.eng_history');
};
