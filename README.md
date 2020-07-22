# Sansaar

## Questions That Need Answering

- [ ]  Currently the system doesn't support sign up like Saral. It's a closed platform. A user needs to be created from the admin panel. What to do in other cases?
- [x]  How can a student be enrolled in multiple academic tracks?
- [x]  What to do when a student gets converted into a team member? How to deal with the distinction?

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

`isTeam` flag will take care if the user is a team member or not. We will need to add a check that academic tracks can only be assigned to a user if they have a student object associated with them. Like if `isTeam` is marked as `False` then certain student level details about a user would need to be given.

1. POST **/users/auth/google**
2. GET **/users**
3. GET **/users/{userId}**
4. GET **/users/me**

### Academic Tracks

1. POST **/tracks**
2. GET **/tracks**
3. GET **/tracks/{trackId}**
4. PUT **/tracks/{trackId}**

### Mentorship

Mentor trees don't exist at a global level. Every academic track can have a mentorship tree in itself. Mentorship trees of two tracks (example: Intro to Design and Intro to Code) can have identical mentorship trees but they will be different objects within the DB.

1. PUT **/tracks/{trackId}/mentorship/users/{userId}/mentees** (Will overwrite the list of mentees under this mentor always)
2. GET **/tracks/{trackId}/mentorship/tree** (Will return the complete mentorship tree under the academic track)

### Academic Track Milestones

1. GET **/tracks/{trackId>/milestones**
2. POST **/tracks/{trackId}/milestones**
3. GET **/tracks/{trackId}/milestones/<milestoneId>**
4. PUT **/tracks/{trackId}/milestones/<milestoneId>**

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
3. Track ID 
4. User ID 
5. Created At

### Mentor Tree

1. Primary Key
2. Mentor ID
3. Mentee ID 
4. Track ID 
5. Created At

### Academic Tracks

1. Primary Key
2. Code
3. Name
4. Description
5. Progress Tracking Cycle Frequency
6. Day of the Week
7. Next Cycle Date
8. # Days to Lock Before Cycle
9. Created At

### Academic Track Milestones

1. Primary Key
2. Name
3. Description
4. Academic Track ID
5. Created At

### Student Milestones Progress

1. Primary Key
2. User ID
3. Academic Track Milestone ID
4. Milestone ID
5. Created At

### Student Academic Tracks

1. Primary Key
2. User ID
3. Academic Track ID
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

### Academic Track Progress Tracking Structure

1. Primary Key
2. Academic Track ID 
3. Progress Parameter ID 
4. Progress Question ID
5. Created At 

### Academic Track Progress Tracking Request

1. Primary Key
2. Mentor ID
3. Mentee ID
4. Track ID
5. Status (Completed, Pending. Maybe later on we can add a functionality of Expired)
6. Created At

### Academic Track Progress

1. Primary Key
2. Academic Track ID
3. Request ID
4. Mentor ID
5. Mentee ID
6. Created At

### Track Parameters Data

1. Primary Key
2. Paramter ID
3. Data (0/1 to be treated as boolean in case progress parameter is boolean otherwise as an integer)
4. Created At

### Track Questions Data

1. Primary Key
2. Question ID
3. Data (Currently only text. Can support other questions later on)
4. Created At
