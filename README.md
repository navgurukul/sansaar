# Sansaar

Everything backend about NavGurukul :)

## Projet set-up
1. clone the repo `git clone https://github.com/navgurukul/sansaar.git`
2. install dependencies `npm install` and then chnage directory `cd sansaar`
3. create .env file inside the server folder 
4. copy sample.env file and past in .env file and change the appropriate field.
5. run `knex migrate:latest` for updating migration file.
6. if any error is throwing while running above script then go inside the postgres server and truncate the         knex_migrations table using ` TRUNCATE TABLE table_name` run knex script again.

## To Dos
- [ ] How to show scope on Swagger?
- [ ] Add service generator in .hc.js
- [ ] Swagger API should work on prod
