exports.up = async (knex, Promise) => {
    return knex.schema.createTable('main.merged_classes',(table)=>{
        table.increments('id');
        table.integer('class_id')
        .references('id')
        .inTable('main.classes')
        table.integer('merged_class_id').references('id').inTable('main.classes')
    })
};

exports.down = async (knex, Promise) => {
    return knex.schema.dropTable('main.merged_classes');
};
