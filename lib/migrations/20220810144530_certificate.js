exports.up = async (knex) => {
  return knex.schema.createTable('main.meraki_certificate', (t) => {
    t.increments('id');
    t.integer('user_id').references('id').inTable('main.users');
    t.string('url');
    t.string('register_at');
    t.datetime('created_at');
    t.integer('pathway_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.meraki_certificate');
};
