<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Video App Test Credentials

## Test User Accounts

| Email                          | Username        | Password     | Role         |
|--------------------------------|-----------------|--------------|--------------|
| qswanson@example.net          | tanyasutton     | password123  | Regular User |
| salazarchristopher@example.org | colingonzales   | password123  | Regular User |
| johnnyblair@example.net       | bgomez          | password123  | Regular User |
| bschmidt@example.com          | isabella20      | password123  | Regular User |
| ebrown@example.com            | brandon38       | password123  | Regular User |
| mary55@example.com            | smcmillan       | password123  | Regular User |
| brandi63@example.net          | gary45          | password123  | Regular User |
| nicholasnguyen@example.com    | trevinotyler    | password123  | Regular User |
| marissa38@example.org         | tyler41         | password123  | Regular User |
| kingalice@example.com         | hcopeland       | password123  | Regular User |

## Additional Test Users
- Total of 40 test users available in `src/data/users.json`
- Each user has pre-populated subscription and watch history data
- Users have varying levels of activity and engagement patterns

## Test Data

### Sample Videos
- Test videos are generated via `src/data/video_data_generator_v2.py`
- Mock video files are stored in the `src/data/` directory
- Thumbnails are generated using placeholder images

### Sample Channels
- Multiple test channels with different content types
- Channel data available in `src/data/channels.json`

### Sample Playlists
- Pre-configured playlists for testing
- Playlist data available in `src/data/playlists.json`

## Development Notes
- All test accounts have pre-populated video libraries
- Comments and interactions are seeded for testing
- Authentication is handled via email/password for development
- User data includes subscription relationships and watch history