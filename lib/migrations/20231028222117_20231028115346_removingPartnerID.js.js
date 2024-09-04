exports.up = function(knex) {
    // return knex.schema.alterTable('main.c4ca_teachers', function (table) {
    //     table.integer('c4ca_partner_id')
    //     .unsigned()
    //     .references('id')
    //     .inTable('main.c4ca_partners')
    //     .onDelete('set null');
    // });
};

exports.down = function(knex) {
    // return knex.schema.alterTable('main.c4ca_teachers', function (table) {
    //     table.dropColumn('c4ca_partner_id');
    // });
};