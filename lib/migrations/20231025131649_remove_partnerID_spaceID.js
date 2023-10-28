exports.up = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
        table.integer('space_id')
        .unsigned()
        .references('id')
        .inTable('main.partner_space')
        .onDelete('set null');
        table.integer('partner_id')
        .unsigned()
        .references('id')
        .inTable('main.partner_space')
        .onDelete('set null');
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('main.classes', function (table) {
        table.dropColumn('space_id');
        table.dropColumn('partner_id');
    });
};