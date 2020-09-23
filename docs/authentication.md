## Authentication

### Endpoints :
    -/users/create : 
        This endpoint is used to create a user. It returns 
                        ```
                        {
                            "user": {
                                "name": "Sawdusty shrimp",
                                "email": "sawdustyo6upa8oq@fake.com",
                                "chat_id": "sawdusty5alcuqr9",
                                "chat_password": "vpjLhi+rfHLk7TICBEN+W98sUL0JxC8P",
                                "created_at": "2020-09-23T19:55:38.633Z",
                                "id": "730"
                                },
                            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjczMCIsImVtYWlsIjoic2F3ZHVzdHlvNnVwYThvcUBmYWtlLmNvbSIsImlhdCI6MTYwMDg5MDk0MSwiZXhwIjoxNjMyNDQ4NTQxfQ.iD847wqE1xnnmEqXYAC-MOFuAqkrrigUi_NervIdKJ8"
                        }
                        ```
                        as a response. user.id can be used to link it to a google account.

    -/users/auth/google :
        Flow 1 - When user wants to create an account with google. This is what expected in the payload
                ```
                {
                    "idToken": "a-long-google-id-token",
                    "mode": "web"
                }
                ```
        This is what the response looks like:
            ```
            {
                "user": {
                    "rolesList": [],
                    "id": "729",
                    "email": "iamsaquibnasim@gmail.com",
                    "name": "Saquib Nasim",
                    "profile_picture": "https://lh3.googleusercontent.com/a-/AOh",
                    "google_user_id": "623053700823887410416",
                    "center": null,
                    "github_link": null,
                    "linkedin_link": null,
                    "medium_link": null,
                    "created_at": "2020-09-23T17:15:58.559Z",
                    "chat_id": "mathematicalcuc3sm5e",
                    "chat_password": "YVI9au42ha4Wv4PPZn4PZi0Ri8a3oDPc",
                    "pathways": []
                },
                "token": "-a-meraki-jwt-token-"
            }