exports.up = async (knex) => {
    return knex.schema.createTable('main.user_store_data',function(table){
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.string('contact').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now()); 
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
};

exports.down = async (knex) => {
    return knex.schema.dropTable('main.user_store_data')
};
