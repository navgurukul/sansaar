exports.up = async (knex) => {
  await knex.schema.createTable('main.eng_levelwise', (table) => {
    table.increments().primary();
    table.integer('level').notNullable();
    table.text('content').notNullable();
    table.integer('article_id').notNullable().references('id').inTable('eng_articles');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.eng_levelwise');
};
