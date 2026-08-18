Features of three apps to be built in Q2 2025
Andojo Music Streaming App – MVP Specification	9
1. Browse Local Music Library	9
Feature Function	9
User Story	9
2. Search Songs (By Title or Artist)	9
Feature Function	9
User Story	9
3. Play Song (Local Playback)	10
Feature Function	10
User Story	10
4. Create Local Playlist	10
Feature Function	10
User Story	10
5. Play Playlist (Sequential Playback)	11
Feature Function	11
User Story	11
6. Shuffle Playlist (Optional Stretch Goal)	11
Feature Function	11
User Story	11
7. Song Metadata Display	11
Feature Function	11
User Story	11





Andojo Music Streaming App – MVP Specification
Inspiration: Spotify-style local experience

1. Browse Local Music Library
Feature Function
Display a list of preloaded songs with metadata (title, artist, duration, album).
User Story
As a user, I want to browse a list of available songs, so I can choose what to play.


Each entry includes:
Title
Artist
Duration
Album
List is displayed in a simple scrollable UI or printed to log

2. Search Songs (By Title or Artist)
Feature Function
Allow users to search for a song or artist name using a basic keyword match.
User Story
As a user, I want to search for songs by artist or title, so I can find what I like quickly.

User enters search term
App returns songs with matching title or artist


3. Play Song (Local Playback)
Feature Function
Mock Playing an audio file from local assets or storage on tap.
User Story
As a user, I want to play a selected song, so I can listen to music.





4. Create Local Playlist
Feature Function
User can add/remove songs to/from a single playlist.
User Story
As a user, I want to create a playlist so I can group my favorite songs.







5. Play Playlist (Sequential Playback)
Feature Function
Play songs in a playlist one after the other.
User Story
As a user, I want to listen to a playlist so I can enjoy continuous music.





6. Shuffle Playlist (Optional Stretch Goal)
Feature Function
Play songs in random order from a playlist.
User Story
As a user, I want to shuffle my playlist so the experience feels fresh.




7. Song Metadata Display
Feature Function
Display song metadata while a song is playing.
User Story
As a user, I want to see details about the song I’m listening to.

Metadata shown: song title, artist, duration
Simple text view or overlay; no album art required


Focus:
Technical feasibility for 2–3 week solo delivery
Feature realism and scope control
Dev complexity per module
Testability and UX compromise tradeoffs
Reviewers:
Mobile Architect
Staff Android Engineer
QA Automation Engineer
Product Strategist


 Safeguards
Precompress audio files to <1MB each out of scope. 
Use fixed-size playlist (e.g., 10–15 tracks max)
Stick to 1 screen, 1 flow UI model
No background playback in MVP
Build with intent to extend, not over-engineer
