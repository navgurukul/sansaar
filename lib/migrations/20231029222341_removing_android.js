exports.up = function(knex) {
    return knex.schema.alterTable('main.facilitators', function (table) {
        table.dropColumn('android_link');
    });
};

exports.down = async (knex, Promise) => {};
