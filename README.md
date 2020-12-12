# Sansaar

Everything backend about NavGurukul :)
This repository holds (will hold, as we are building it) the universe of NavGurukul.
All the APIs exist here.

Your contribution is more than welcomed 🤩
## Project set-up
- Clone the repo `git clone https://github.com/navgurukul/sansaar.git`
- Install dependencies `npm install` and then chnage directory `cd sansaar`
- `npm install -g knex`
- Copy `server/sample.env` file to `server/.env` file and change the appropriate field.
- Run `knex migrate:latest` for updating migration file.
- If any error is throwing while running above script then login to the postgres server and remove all the rows of the the knex_migrations table using `TRUNCATE TABLE knex_migrations` and run `knex migrate:latest` again.
## Code Strucutre
- *The philosophy of the code strucutre is keeping things as small as they can be. Keeping functions small, components small, and files small. Basically keeping everything as small as they can be. Like Minions, We love Minions. Who doesn't .*

### The file structure looks something like this.
```

    ├── curriculum                      # All course content files in markdown
        ├── course1                     # Example course
        ├── course2                     # Example course
    ├── docs                            # Segragated documentation for the APIs
        ├── authentication.md           # Authentication flow
    ├── lib                             # Source files
        ├── auth/jwt.js                 # Contains JWT configuration.
        ├── bot                         # Things related to Matrix bot
            ├── actions.js              # Functions that does and return bot and matrix related stuff
            ├── calendar.js             # Functions that create and delete Google calendar events(irrelevant to bot 😜)
            ├── index.js                # Mainly constants like message body etc.
        ├── config                      # Backend configurations.
            ├── constants.js            # Constant values like user roles and progress tracking. 
            ├── index.js                # Converts all the env variables into meaningful variables.
        ├── courseSeeder/index.js       # Used to seed courses from /curriculum to database.
        ├── dbTriggers/index.js         # Auto updates database in completion of a course. 
        ├── extensions/error.js         # Hapi/Boom configuration.
        ├── helpers                     # All utility functions/providers.
            ├── assets                  # Contains assets link.
                ├── profilePicture.js   # Contains default user profile image links.
            ├── network                 # Axios configurations.
                ├── chat.js             # Axios configuration for matrix API calls.
            ├── courseSeeder/index.js   # Could be redundant [x].
            ├── index.js                # All general helper functions.
        ├── migrations                  # Contains knex migration files.
        ├── models                      # Contains database table models and their relations.
            ├── model1                  # Example model.
            ├── model2                  # Example model.
        ├── plugins                     # Contains plugins files.
            ├── hapi-auth-jwt.js        # Todo [].
            ├── schmervice.js           # Todo [].
            ├── schwifty.js             # Todo [].
        ├── routes                      # Contains all routes.
            ├── route1                  # Example route.
            ├── route2                  # Example route.
        ├── service                     # Contains service functions interacting with models.
            ├── service1                # Example service.
            ├── service2                # Example service.
        ├── testingScript/index.js      # Scripts for automating API calls.
        ├── .hc.js                      # Plugin config for models and routes.
        ├── bind.js                     # Binds transaction object to objection.
        ├── index.js                    # HauteCouture plugin configuration
    ├── node_modules                    # All node packages
    ├── server                          # All stuff related to server
        ├── plugins                     # Plugins used with server
            ├── swagger/index.js        # Swagger plugin integration with server
        ├── .env                        # Environment variables
        ├── index.js                    # Server initialization
        ├── knex.js                     # Knex initialization with matrix database (Not to be confused with primary database)
        ├── manifest.js                 # All plugins associated with server and database
    ├── test/index.js                   # Testing file
    ├── .eslintrc.js                    # ES Lint config file
    ├── .gitignore.js                   # All things that shouldn't be pushed to github
    ├── .prettierrc                     # Prettier config file
    ├── bot.json                        # Todo []
    ├── knexfile.js                     # Registers knex file to schwifty
    ├── README.md                       # This file
    ├── Spec.md                         # Constants specifications documentation file
  ```



## To Dos
- [ ] How to show scope on Swagger?
- [ ] Add service generator in .hc.js
- [ ] Swagger API should work on prod

## course add and update

running it with `--addUpdateSingleCourse` will add or update single course returned by the server.

```bash
node lib/courseSeeder/index.js --addUpdateSingleCourse {course_name}
```

running below script will add or update all course returned by the server.

```bash
node lib/courseSeeder/index.js 
```

## Curriculum
1. ```git clone https://github.com/navgurukul/newton curriculum```
