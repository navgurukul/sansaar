exports.up = async (knex) => {
    await knex.schema.createTable('main.users_search',(table)=>{
        table.increments('id').primary();
        table.integer('user_id')//.references('id').inTable('main.users');
        table.string('name');
        table.datetime('created_at');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.users_search')
};