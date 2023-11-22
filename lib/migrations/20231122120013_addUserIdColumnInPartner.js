exports.up = async (knex, Promise) => {
  await knex.schema.table('main.c4ca_partners', (table) => {
    table.dropColumn('email');
    table.dropColumn('point_of_contact');
    table.integer('user_id').unsigned().references('id').inTable('users');
  });
};

exports.down = function (knex) {
    return knex.schema.table('main.c4ca_partners', function (table) {
      table.dropColumn('user_id');
    });
  };
