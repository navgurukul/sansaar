exports.up = async (knex) => {
  await knex.schema.createTable('main.eng_articles', (table) => {
    table.increments().primary();
    table.string('title').notNullable();
    table.string('source_url').notNullable();
    table.string('image_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.eng_articles');
};
