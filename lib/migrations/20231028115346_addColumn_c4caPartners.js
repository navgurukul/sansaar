exports.up = function(knex) {
    return knex.schema.alterTable('main.facilitators', function (table) {
        table.integer('c4ca_partner_id')
        .unsigned()
        .references('id')
        .inTable('main.c4ca_partners')
        .onDelete();
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('main.facilitators', function (table) {
        table.dropColumn('c4ca_partner_id');
    });
};