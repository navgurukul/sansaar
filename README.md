# Sansaar

Everything backend about NavGurukul :)
This repository holds (will hold, as we are building it) the universe of NavGurukul.
All the APIs exist here.

Your contribution is more than welcomed 🤩
## Project setup
- Update your node version to 14+. Follow the below steps to do so: 
    - `npm cache clean -f`
    - `npm install -g n`
    - `n latest`<br />
    *You are free to update Node version without `n module`*
- Clone the repo `git clone https://github.com/navgurukul/sansaar.git`
- Install dependencies `npm install` and then chnage directory `cd sansaar`
- `npm install -g knex`
- Copy `server/sample.env` file to `server/.env` file and change the appropriate field.
- Run `knex migrate:latest` for updating migration file.
- If any error is throwing while running above script then login to the postgres server and remove all the rows of the the knex_migrations table using `TRUNCATE TABLE knex_migrations` and run `knex migrate:latest` again.
## Code Strucutre
- *The philosophy of the code structure is keeping things as small as they can be. Keeping functions small, components small, and files small. Basically keeping everything as small as they can be. Like Minions, We love Minions. Who doesn't .*

### The file structure looks something like this.
```

    ├── curriculum                      # All course content files in markdown
        ├── course1                     # Example course
        ├── course2                     # Example course
    ├── curriculum_new                  # All course content files in JSON
        ├── course1_json                # Example course
        ├── course2_json                # Example course
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
        ├── googleTranslation/index.js  # Translate course with the help of lang code (--hi, --mr etc.).        
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

We are following the MVC pattern here. 
All routes reside inside **/lib/routes**. 
All controllers inside **/lib/service**.
All models inside **/lib/models**.
### Tech Stack.
- **NodeJS** : We share a love-hate relationship with JavaScript, but our love for it outweighs the hate 😛. 
- **PostgreSQL** : One of the good things about Postgres is that it is ORDBMS (O for object) rather than just RDMS.
- [**HapiJS**](https://hapi.dev/) : What Express does, HapiJS can do it in style. It's easy, it's clean and comes with a built in support for input validation, caching and error handling, so you can be Hapi (*pun intended*).
    #### Hapi Plugin
    - [@hapi/boom](https://hapi.dev/module/boom/) : HTTP friendly error objects
    - [@hapi/bounce](https://hapi.dev/module/bounce/) : Selective error catching and rewrite rules
    - [@hapi/glue](https://hapi.dev/module/glue/) : Server composer for HapiJS
    - [@hapi/inert](https://hapi.dev/module/inert/) : Static files and directory handlers plugin
    - [@hapi/joi](https://joi.dev/) : Object schema validation
    - [@hapi/vision](https://hapi.dev/module/vision/) : Templates rendering plugin support
    - [schmervice](https://github.com/hapipal/schmervice) : Hapi service registry
    - [schwifty](https://github.com/hapipal/schwifty) : Plugin integrating Objection ORM

- [**matrix-bot-sdk**](https://github.com/turt2live/matrix-bot-sdk) : Matrix bot sdk provides a bot for the matrix server.
- [**Objection**](https://vincit.github.io/objection.js/) : Objection coupled with [**knex**](http://knexjs.org/) lets you write clean and easy to understand SQL queries.

*Other libraries and third-party packages where used as and when required*

### Understanding the flow of :-
 - **API calls** : The API calls are handled by routes, and data is fetched (or inserted) from (or into) the database through services to models. So basically :- 
    - *Routes* : Handles your network request and returns a response but before returning a response, it obviously interact with the models through service functions.

    - *Service* : Services are the middlemen which abstract away the necessity of direct interaction of routes with the database models. Each component of data dealing with model has been handled through an exclusive service of their own. For example, to fetch, insert, update or delete into courses model, a courses service (*/services/courses.js*) exists. Same applies for classes model. However, *displayService.js* is the only service that has functions defined for fetching/inserting data using relation mapping among models and that's the reason why you will find it interacting with courses, classes, pathway, exercises etc.
    
    - *Models* : All database table/schema and their relations are defined here with the help of Objection. The validation is done through [@hapi/joi](https://joi.dev/)

    So, to simplify things `Routes --> Services --> Models` 

    <br />

 - **The Bot** : We have used [matrix-bot-sdk](https://github.com/turt2live/matrix-bot-sdk) that acts as a separate entity among users (only for chat service obviously) of Meraki and does a handful of tasks which includes :-<br />
    - Onboarding a new user, taking their language preference etc.<br />
    - Add a user to a channel using specific commands (we are going to add many more bot commands).<br />
    - Send class joining confirmation message with joining meet link.<br />
    - Send a class reminder message 15 minutes prior to class.<br /><br />
 The bot object is defined alongside with our server in `/server/index.js` since we want it to start and work synchronously with our server.<br />
 *Enough talking, Now let's understand the actual flow of bot. The following is the folder structure:-*<br /><br />
    - **`lib/bot/action.js`** : It is comprised of functions that are designed to do tasks related to matrix server. It interacts with our matrix database to perform tasks like getting a user's room ID with the bot, or even any public room ID as a matter of fact. It even does synapse API calls as an admin (the bot is a server admin) to create a room, join a room etc.<br />
    - **`lib/bot/index.js`** : Comprised of constants like class joining message body, class reminder message body etc.<br />
    - **`lib/services/chat.js`** : Has all the functions that reads a user command and replies accordingly or send automated message.<br />

## Course Seeder
A course is designed and written in markdown and maintained at [**Newton**](https://github.com/navgurukul/newton). A dedicated team at NavGurukul works on designing the curriculum.

**To seed a course from mark down into the database, follow the below steps :-**

- Pull your courses into **/lib/curriculum** directory
```bash
git clone https://github.com/navgurukul/newton curriculum
```

- Seed a single course, of course replace {course_name} with the name of the folder of the course you want to seed
```bash
node lib/courseSeeder/index.js --addUpdateSingleCourse {course_name}
```

OR

- Seed all courses from the curriculum directory.
```bash
node lib/courseSeeder/index.js 
```

## To connect android app to your local dev server
 - Install this build from [here](https://drive.google.com/file/d/1BJtHeEwQfuVhLHdLSo2Q6IAQYPpUOPtV/view?usp=sharing)
 - Install [ngrok](https://dashboard.ngrok.com/get-started/setup)
 - Set up your ngrok with your token
 - Start your local server and tunnel it to a public IP 
 - Go to the build installed from above link and open profile.
 - Set the public IP provided by ngrok in server url field.

## To Dos
- [ ] How to show scope on Swagger?
- [ ] Add service generator in .hc.js
- [ ] Swagger API should work on prod