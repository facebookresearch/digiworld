# Parking App Test Credentials

## Test User Accounts

| Email                           | Full Name         | Password            |
| ------------------------------- | ----------------- | ------------------- |
| julie.payne0@example.com        | Julie Payne       | juliepayne123       |
| karen.decker1@example.com       | Karen Decker      | karendecker123      |
| barbara.odonnell2@example.com   | Barbara Odonnell  | barbaraodonnell123  |
| ryan.simon3@example.com         | Ryan Simon        | ryansimon123        |
| shane.smith4@example.com        | Shane Smith       | shanesmith123       |
| kevin.erickson5@example.com     | Kevin Erickson    | kevinerickson123    |
| victoria.wilson6@example.com    | Victoria Wilson   | victoriawilson123   |
| antonio.roberts7@example.com    | Antonio Roberts   | antonioroberts123   |
| carly.preston8@example.com      | Carly Preston     | carlypreston123     |
| mia.rivera9@example.com         | Mia Rivera        | miarivera123        |
| samuel.wolfe10@example.com      | Samuel Wolfe      | samuelwolfe123      |
| joshua.tyler11@example.com      | Joshua Tyler      | joshuatyler123      |
| vanessa.sparks12@example.com    | Vanessa Sparks    | vanessasparks123    |
| julie.hamilton13@example.com    | Julie Hamilton    | juliehamilton123    |
| charles.landry14@example.com    | Charles Landry    | charleslandry123    |
| kristina.johnson15@example.com  | Kristina Johnson  | kristinajohnson123  |
| miguel.curry16@example.com      | Miguel Curry      | miguelcurry123      |
| nathan.avery17@example.com      | Nathan Avery      | nathanavery123      |
| vanessa.buchanan18@example.com  | Vanessa Buchanan  | vanessabuchanan123  |
| judy.fox19@example.com          | Judy Fox          | judyfox123          |
| virginia.schmidt20@example.com  | Virginia Schmidt  | virginiaschmidt123  |
| elizabeth.jenkins21@example.com | Elizabeth Jenkins | elizabethjenkins123 |
| sandra.bell22@example.com       | Sandra Bell       | sandrabell123       |
| joshua.fischer23@example.com    | Joshua Fischer    | joshuafischer123    |
| randy.harmon24@example.com      | Randy Harmon      | randyharmon123      |

## Test Data Summary

- **Total Users**: 25 test users available in `src/data/mock-users.json`
- All users have pre-populated data including email, password, full name, and phone number
- Phone numbers are formatted as +1 followed by 10 digits (e.g., +18626720465)
- Passwords are meaningful and based on user names for easy testing

## Recommended Test Accounts

### For Basic Testing

- **Email**: `julie.payne0@example.com`
- **Password**: `juliepayne123`
- **Status**: Active

## Development Notes

- All test accounts are seeded in the local SQLite database
- User authentication is handled via email/password
- Passwords are stored as plain text for development/testing purposes
- User data includes full name and phone number
- Status field indicates whether account is active or disabled
- All data is stored locally - no external authentication services
- Phone numbers are standardized to +1 country code with 10-digit format

## Mock Data

### Parking Zones

- Parking zones are seeded in the database
- Zone data includes zone code, name, coordinates, and availability
- All zone information is stored locally

### User Locations

- User locations are mocked/simulated in the database
- Location coordinates are stored locally
- No real GPS or location services required
