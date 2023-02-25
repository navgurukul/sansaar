exports.up = async (knex) => {
    await knex.schema.createTable('main.users_popular_search',(table)=>{
        table.increments('id').primary();
        table.string('course_name').unique();
        table.integer('count').notNullable().defaultTo(0)
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.users_popular_search')// user_search
};