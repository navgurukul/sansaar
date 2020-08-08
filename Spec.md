# Sansaar

## Questions That Need Answering

- [ ]  Currently the system doesn't support sign up like Saral. It's a closed platform. A user needs to be created from the admin panel. What to do in other cases?
- [x]  How can a student be enrolled in multiple pathways?
- [x]  What to do when a student gets converted into a team member? How to deal with the distinction?

## Glossary

### Users
Users of different NG products. A user can either be a team member or a student. Some users can be both. Currently there are different backends for NG products.

### Pathways
Students might be enrolled in a single or multiple pathways. Example: Intro to Canva (Remote) & NavGurukul Residential Prorgram. Every pathway will have its own mentor tree. Every pathway will have a frequency on which the progress tracking for it will take place. Example: Intro to Canva might have weekly progress tracking every Wednesday & NavGurukul Residential Program might have fortnightly progress tracking on every 10th day of the fortnight.

### Progress Tracking
TODO

### Progress Questions
TODO

### Progress Parameters
TODO

### Milestones
TODO

## Navigation

1. Home
2. Users
3. Pathways
4. Progress Tracking
    - Parameters
    - Questions
    - My Mentees
    - All Requests
    - My Requests
    - My Progress

## Available Roles

Every user can have multiple roles assigned to them.

1. Student
2. Team Member
3. Training & Placement Council
4. Admissions Incharge
5. Facha
6. Dumbeldore (Will have all permissions everywhere)

## API Endpoints

### Users

`isTeam` flag will take care if the user is a team member or not. We will need to add a check that academic pathways can only be assigned to a user if they have a student object associated with them. Like if `isTeam` is marked as `False` then certain student level details about a user would need to be given.

1. ~~POST **/users/auth/google**~~
2. ~~GET **/users**~~
3. ~~GET **/users/{userId}**~~
4. ~~GET **/users/me**~~

### Academic Pathways

1. ~~POST **/pathway**~~
2. ~~GET **/pathway**~~
3. ~~GET **/pathway/{pathwayId}**~~
4. ~~PUT **/pathway/{pathwayId}**~~

### Pathway Milestones

1. ~~GET **/pathway/{pathwayId>/milestones**~~
2. ~~POST **/pathway/{pathwayId}/milestones**~~
3. ~~GET **/pathway/{pathwayId}/milestones/{milestoneId}**~~
4. ~~PUT **/pathway/{pathwayId}/milestones/{milestoneId}**~~

### Mentorship

Mentor trees don't exist at a global level. Every academic pathway can have a mentorship tree in itself. Mentorship trees of two pathway (example: Intro to Design and Intro to Code) can have identical mentorship trees but they will be different objects within the DB.

1. PUT **/pathway/{pathwayId}/mentorship/users/{userId}/mentees** (Will overwrite the list of mentees under this mentor always)
2. GET **/pathway/{pathwayId}/mentorship/tree** (Will return the complete mentorship tree under the academic pathway)

### Progress Parameters

1. POST **/progressTracking/parameters**
2. GET **/progressTracking/parameters**
3. GET **/progressTracking/parameters/{parameterId}**
4. PUT **/progressTracking/pramaters/{parameterId}**

### Progress Questions

1. POST **/progressTracking/questions**
2. GET **/progressTracking/questions**
3. GET **/progressTracking/questions/{questionId}**
4. PUT **/progressTracking/questions/{questionId}**

### Progress Tracking Requests
1. GET **/progressTracking/users/{userId}/trackingRequests/toAnswer** (Returns a list of all progress tracking requests)
2. POST **/progressTracking/users/{userId}/trackingRequests/{requestId}** (Complete a progress tracking request.)
3. POST **/progressTracking/pathway/{pathwayId}/users/{userId}/milestone** (Add a milestone for a user.)
4. GET **/progressTracking/pathway/{pathwayId}/users/{userId}/milestone** (Get all milestones for a user.)
5. GET **/progressTracking/pathway/{pathwayId}** (Get progress of all users on a pathway)

## Tables

### Users

1. Primary Key
2. Name
3. Google Profile Pic
4. eMail
5. Team Member? (Boolean)
6. Created At

### User Roles

1. Primary Key
2. User ID
3. Role Name
4. Created At

### Students

1. Primary Key
2. Name
3. Pathway ID 
4. User ID 
5. Created At

### Mentor Tree

1. Primary Key
2. Mentor ID
3. Mentee ID 
4. Pathway ID 
5. Created At

### Academic Pathway

1. Primary Key
2. Code
3. Name
4. Description
5. Progress Tracking Cycle Frequency
6. Day of the Week
7. Next Cycle Date
8. Days to Lock Before Cycle
9. Created At

### Pathway Milestones

1. Primary Key
2. Name
3. Description
4. Pathway ID
5. Created At

### Student Milestones Progress

1. Primary Key
2. User ID
3. Pathway Milestone ID
4. Milestone ID
5. Recorded By (User ID)
5. Created At

### Student Pathway

1. Primary Key
2. User ID
3. Academic Pathway ID
4. Created At

### Progress Parameters

1. Primary Key
2. Type (Boolean or Integer Range)
3. Min Range
4. Max Range
5. Created At

### Progress Questions

1. Primary Key
2. Type (Short Text, Boolean, Dropdown, Large Text)
3. Created At 

### Pathway Progress Tracking Structure

1. Primary Key
2. Pathway ID 
3. Progress Parameter ID 
4. Progress Question ID
5. Created At 

### Pathway Progress Tracking Request

1. Primary Key
2. Mentor ID
3. Mentee ID
4. Track ID
5. Status (Completed, Pending. Maybe later on we can add a functionality of Expired)
6. Created At

### Pathway Progress

1. Primary Key
2. Pathway ID
3. Request ID
4. Mentor ID
5. Mentee ID
6. Created At

### Pathway Parameters Data

1. Primary Key
2. Paramter ID
3. Data (0/1 to be treated as boolean in case progress parameter is boolean otherwise as an integer)
4. Created At

### Pathway Questions Data

1. Primary Key
2. Question ID
3. Data (Currently only text. Can support other questions later on)
4. Created At
