exports.up = async (knex) => {
  return knex.schema.createTable('meraki_certificate', (t) => {
    t.increments('id');
    t.integer('user_id').references('id').inTable('main.users').unique();
    t.string('url');
    t.string('register_at');
    t.datetime('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('meraki_certificate');
};
