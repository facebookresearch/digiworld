<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Flight Booking App Test Credentials

## Test User Accounts

| Email                    | Username     | Password            | Bio                                    |
|--------------------------|--------------|---------------------|----------------------------------------|
| john.doe@example.com     | johndoe      | hashed_password_123 | Frequent traveler and aviation enthusiast |
| sarah.smith@example.com  | sarahsmith   | hashed_password_456 | Business traveler and miles collector  |
| mike.wilson@example.com  | mikewilson   | hashed_password_789 | Adventure seeker and world explorer    |
| emma.davis@example.com   | emmadavis    | hashed_password_101 | Travel blogger and frequent flyer      |
| alex.chen@example.com    | alexchen     | hashed_password_202 | Digital nomad and travel tech enthusiast |

## User Data Structure
- Total of 5 test users available in `src/data/mock-users.json`
- Each user includes: id, email, username, password, avatar, bio, timestamps
- Users have different travel styles and interests
- All users created between January-February 2024

## Test Data

### User Profiles
- Each user has a unique avatar URL and bio description
- User creation and update timestamps are tracked
- Soft delete functionality with `deleted_at` field

### Flight Booking Features
- Users can search and book flights
- Different user types: frequent travelers, business travelers, adventurers, bloggers
- Authentication handled via email/password for development

## Development Notes
- All test accounts have pre-populated booking history
- User authentication is handled via email/password for development
- User data includes flight preferences and booking history
- Bio fields help test different traveler personas and use cases
