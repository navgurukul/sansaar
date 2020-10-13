# Authentication

## Endpoints

- **/users/create** : 
    *This endpoint is used to create a user.*
    *It does not take any payload and creates\ a random name, and email for the user.* 
    
        Demo response:
            {
                "user": {
                    "name": "Sawdusty shrimp",
                    "email": "sawdustyo6upa8oq@fake.com",
                    "chat_id": "sawdustqr5ayulc9",
                    "chat_password": "fHL+W98skvpjLhi+rU7TICBENL0JxC8P",
                    "created_at": "2020-09-23T19:55:38.633Z",
                    "id": "730"
                    },
                "token": "-a-meraki-jwt-token-"
            }        
    user.id can be used to link it to a google account.



- **/users/auth/google** :

    *Flow 1 - When user wants to create an account with google.*

        Expected payload looks like:
            {
                "idToken": "-a-long-google-id-token-",
                "mode": "web"
            }
    
    *Flow 2 - This flow comes into play when the user has already created an account using `/users/create`.* 
    They will then validate their account using google authorization 
    by linking the user.id they recieved from `/users/create`. 
    
        Expected payload looks like:         
            {
                "idToken": "a-long-google-id-token",
                "mode": "web",
                "id": 730
            }

        
        This is what the response of a successful /users/auth/google looks like:
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
                    "chat_password": "aYVIPZnv4Pu42ha4W4PZi0a3oD9Ri8Pc",
                    "pathways": []
                },
                "token": "-a-meraki-jwt-token-"
            }
