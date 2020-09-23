## Authentication

### Scenarios / Flows :
    
    - /users/create : This endpoint is used to create a user. It returns 
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