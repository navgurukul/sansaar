# Sansaar Project

## Overview
The Sansaar project is a web application that provides various user-related functionalities, including user registration, authentication, and profile management. This project is built using Node.js and follows a modular architecture, separating routes and services for better maintainability.

## Project Structure
```
sansaar
├── lib
│   ├── routes
│   │   ├── users.js          # Contains route definitions for user-related APIs
│   └── services
│       ├── userService.js    # Contains business logic for user-related operations
├── package.json               # Configuration file for npm
└── README.md                  # Documentation for the project
```

## Features
- User registration and authentication
- Profile management
- Retrieve user data, including random users with non-null contact information

## API Endpoints
### User Routes
- `POST /users/create`: Create a new user.
- `POST /users/auth/google`: Authenticate user with Google.
- `GET /users/random`: Retrieve 10 random users with non-null contact information.

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd sansaar
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
To start the application, run:
```
npm start
```

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.