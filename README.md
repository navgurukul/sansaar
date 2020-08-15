# Sansaar

Everything backend about NavGurukul :)

## Projet set-up
- [] create .env file inside the server folder 
- [] copy sample.env file and past in .env file and change the appropriate field.
- [] run `knex migrate:latest` for updating migration file.
- [] if any error is throwing while running above script then go inside the postgres server and truncate the         knex_migrations table using ` TRUNCATE TABLE table_name`
- [] run knex script again.

## To Dos
- [ ] How to show scope on Swagger?
- [ ] Add service generator in .hc.js
- [ ] Swagger API should work on prod
