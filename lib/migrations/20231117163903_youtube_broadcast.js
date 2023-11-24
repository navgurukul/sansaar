exports.up = async (knex) => {
    await knex.schema.createTable('main.youtube_broadcast', (table) => {
      table.increments().primary();
      table.string('video_id').notNullable();
      table.integer('class_id');
      table.integer('recurring_id');
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('main.youtube_broadcast');
  };
  