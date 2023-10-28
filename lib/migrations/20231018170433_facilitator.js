exports.up = async (knex) => {
  await knex.schema.createTable('main.facilitators', (table) => {
    table.increments().primary();
    table.string('name').notNullable();
    table.string('point_of_contact');
    table.string('email').notNullable();
    table.string('web_link');
    table.string('android_link');
    table.string('phone_number').notNullable();
    table.integer('partner_id').references('id').inTable('main.partners').onDelete('CASCADE');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('main.facilitators');
};
