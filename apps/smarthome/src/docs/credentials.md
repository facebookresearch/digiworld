<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Smart Home App Test Credentials

## Test User Accounts

| Email                    | Username     | Password            | Bio                                    |
|--------------------------|--------------|---------------------|----------------------------------------|
| john.doe@example.com     | johndoe      | hashed_password_123 | Smart home enthusiast and tech lover   |
| sarah.smith@example.com  | sarahsmith   | hashed_password_456 | Home automation expert                 |
| mike.wilson@example.com  | mikewilson   | hashed_password_789 | Security conscious homeowner           |
| emma.davis@example.com   | emmadavis    | hashed_password_101 | Music lover and smart home user        |
| alex.chen@example.com    | alexchen     | hashed_password_202 | Tech professional and early adopter    |

## User Data Structure
- Total of 5 test users available in `src/data/users.json`
- Each user includes: id, email, username, password, avatar, bio, timestamps
- Users have different smart home expertise levels and interests
- All users created between January-February 2024

## Test Data

### User Profiles
- Each user has a unique avatar URL and bio description
- User creation and update timestamps are tracked
- Soft delete functionality with `deleted_at` field

### Smart Home Features
- Users can manage various smart home devices and automations
- Different user types: enthusiasts, experts, security-focused, music lovers
- Authentication handled via email/password for development

## Development Notes
- All test accounts have pre-populated smart home data
- User authentication is handled via email/password for development
- User data includes device management and automation preferences
- Bio fields help test different user personas and use cases