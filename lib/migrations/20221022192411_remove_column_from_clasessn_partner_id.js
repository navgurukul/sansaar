exports.up = async (knex){
    await knex.schema.alterTable("main.classes",(table)=>{
        table.dropColumn("partner_id")
    })
}

exports.down = async(knex){
    knex.schema.alterTable("main.classes",(table)=>{
        table.integer("partner_id").unsigned().references("id").inTable("main.partners").nullable()
    })
}
