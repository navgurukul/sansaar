exports.up =  async (knex) => {
    await  knex.schema.alterTable('main.facilitators', function (table) {
        table.dropColumn('partner_id');
    });
    await knex.schema.alterTable('main.c4ca_teachers', function (table) {
        table.dropColumn('partner_id');
    });
    
};

exports.down = async (knex) => {
};