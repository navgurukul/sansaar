exports.up = async (knex) => {
    await knex.schema.createTable('main.youtube_broadcast', (table) => {
      table.increments().primary();
      table.string('video_id').notNullable();
      table.integer('class_id').references('id').inTable('main.classes').onDelete('CASCADE');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.youtube_broadcast');
  };
  