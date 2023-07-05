exports.up = async (knex) => {
    await knex.schema.withSchema('main').alterTable('meraki_certificate', (t) => {
      t.dropUnique(['user_id']);
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.withSchema('main').alterTable('meraki_certificate', (t) => {
      t.unique(['user_id']);
    });
  };
  