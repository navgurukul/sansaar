exports.up = async (knex, Promise) => {
  return knex.schema.createTable('main.partner_space', (table) => {
    table.increments('id');
    table
      .integer('partner_id')
      .unsigned()
      .references('id')
      .inTable('main.partners')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('space_name');
    table.string('point_of_contact_name');
    table.string('email');
  });
};

exports.down = async (knex, Promise) => {
  return knex.schema.dropTable('main.partner_space');
};
