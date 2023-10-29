exports.up = function(knex) {
    
};

exports.down = async (knex) => {
    return knex.schema.alterTable('main.facilitators', function (table) {
        table.dropColumn('android_link');
    });
};
