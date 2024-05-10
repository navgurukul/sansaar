exports.up = async (knex) => {
  await knex.schema.withSchema('main').alterTable('meraki_certificate', (table) => {
    table.dropUnique(['user_id']);
  });
  await knex.schema.alterTable('main.meraki_certificate ', (table) => {
    table.integer('pathway_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.withSchema('main').alterTable('meraki_certificate', (table) => {
    table.unique(['user_id']);
  });
  await knex.schema.alterTable('main.meraki_certificate ', (table) => {
    table.dropColumn('pathway_id');
  });
};
