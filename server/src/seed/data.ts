/** Fictional demo listeners, their Mood Drops, Sound Rooms and curated playlists. All sample content. */

// username | display name | bio | languages | genres | artists | moods
export const USERS: [string, string, string, string[], string[], string[], string[]][] = [
  ['mira.after', 'Mira Anand', 'collecting songs like polaroids. chennai, then wherever.', ['Tamil', 'English'], ['film', 'indie'], ['A.R. Rahman', 'Phoebe Bridgers', 'Govind Vasantha'], ['Nostalgic', 'Dreamy', 'Late Night']],
  ['kabir.wav', 'Kabir Mehta', 'guitar bands and long train rides.', ['Hindi', 'English'], ['indie', 'rock'], ['The Local Train', 'Arctic Monkeys', 'Prateek Kuhad'], ['Restless', 'Hopeful', 'Freedom']],
  ['noor.fm', 'Noor Fathima', 'soft songs, strong chai, backwater sunsets.', ['Malayalam', 'English', 'Hindi'], ['film', 'R&B'], ['Sushin Shyam', 'Frank Ocean', 'SZA'], ['Romantic', 'Peaceful', 'Dreamy']],
  ['theo.static', 'Theo Lindqvist', 'synths, fog, and whatever Radiohead meant by that.', ['English', 'Instrumental'], ['electronic', 'alternative'], ['Radiohead', 'Jon Hopkins', 'Massive Attack'], ['Lost', 'Late Night', 'Inspired']],
  ['anjali.tapes', 'Anjali Raman', 'grew up on cassette rewinds and Harris interludes.', ['Tamil', 'English', 'Instrumental'], ['film', 'classical'], ['Harris Jayaraj', 'Ludovico Einaudi', 'Bombay Jayashri'], ['Peaceful', 'Nostalgic', 'Romantic']],
  ['zaid.afterdark', 'Zaid Qureshi', 'bass first, questions later.', ['Hindi', 'Punjabi', 'English'], ['hip-hop', 'R&B'], ['The Weeknd', 'AP Dhillon', 'Kendrick Lamar'], ['Late Night', 'Confident', 'Unbothered']],
  ['lucia.sol', 'Lucía Moreno', 'if the chorus is big enough I will run to it.', ['Spanish', 'English'], ['pop', 'indie'], ['Bad Bunny', 'Lorde', 'Florence + The Machine'], ['Euphoric', 'Freedom', 'Main Character']],
  ['arjun.b.side', 'Arjun Balakrishnan', 'first-day-first-show energy, B-side heart.', ['Tamil', 'Telugu', 'English'], ['film', 'hip-hop'], ['Anirudh Ravichander', 'Sid Sriram', 'Tyler, The Creator'], ['Confident', 'Euphoric', 'Romantic']],
  ['june.haze', 'June Park', 'city pop at dawn. dream pop at dusk.', ['Korean', 'English', 'Japanese'], ['pop', 'indie'], ['IU', 'Beach House', 'Mariya Takeuchi'], ['Dreamy', 'Nostalgic', 'Lonely']],
  ['dev.minor', 'Dev Sharma', 'everything in a minor key, including my texts.', ['Hindi', 'English', 'Instrumental'], ['indie', 'classical'], ['Anuv Jain', 'Bon Iver', 'Max Richter'], ['Melancholic', 'Heartbroken', 'Peaceful']],
  ['sana.rewinds', 'Sana Iyer', 'rewinding the same thirty seconds since 2009.', ['Tamil', 'Hindi', 'English'], ['film', 'pop'], ['Shreya Ghoshal', 'Taylor Swift', 'Arijit Singh'], ['Nostalgic', 'Romantic', 'Hopeful']],
  ['otis.blue', 'Otis Carter', 'kind of blue, mostly on purpose.', ['English', 'Instrumental'], ['jazz', 'R&B'], ['Miles Davis', 'Daniel Caesar', 'Nina Simone'], ['Late Night', 'Romantic', 'Unbothered']],
  ['meera.monsoon', 'Meera Nair', 'rain person. window seat always.', ['Malayalam', 'Tamil', 'English'], ['film', 'indie'], ['Shahabaz Aman', 'Hozier', 'Pradeep Kumar'], ['Peaceful', 'Melancholic', 'Dreamy']],
  ['felix.reverb', 'Felix Okafor', 'psychedelic on weekdays, French on weekends.', ['English', 'French'], ['alternative', 'electronic'], ['Tame Impala', 'M83', 'Stromae'], ['Main Character', 'Peaceful Chaos', 'Freedom']],
  ['tara.2am', 'Tara Kapoor', 'awake when I should not be. listening anyway.', ['Hindi', 'English'], ['R&B', 'pop'], ['Joji', 'Billie Eilish', 'Frank Ocean'], ['Lonely', 'Late Night', 'Heartbroken']],
  ['vikram.vinyl', 'Vikram Rao', 'highway playlists and my father’s record shelf.', ['Telugu', 'Tamil', 'Hindi', 'English'], ['film', 'rock'], ['Thaman S', 'Fleetwood Mac', 'A.R. Rahman'], ['Nostalgic', 'Freedom', 'Inspired']],
  ['elle.cinema', 'Elle Fournier', 'I only listen to music that could be end credits.', ['French', 'English', 'Instrumental'], ['classical', 'alternative'], ['Hans Zimmer', 'Kate Bush', 'Édith Piaf'], ['Main Character', 'Inspired', 'Dreamy']],
  ['rhea.unsent', 'Rhea D’Souza', 'drafts folder full of feelings.', ['English', 'Hindi'], ['indie', 'pop'], ['Olivia Rodrigo', 'Clairo', 'Prateek Kuhad'], ['Heartbroken', 'Hopeful', 'Unbothered']],
  ['sam.slowdown', 'Sam Whitaker', 'slow mornings, old records, no notifications.', ['English'], ['indie', 'jazz'], ['Norah Jones', 'Bright Eyes', 'Fleetwood Mac'], ['Peaceful', 'Hopeful', 'Nostalgic']],
  ['karthik.kuthu', 'Karthik Subramanian', 'will dance at your wedding and cry at the reception.', ['Tamil', 'English', 'Malayalam'], ['film', 'electronic'], ['Santhosh Narayanan', 'Dhee', 'Daft Punk'], ['Euphoric', 'Confident', 'Peaceful Chaos']],
];

// username | song title | mood | caption | background | room slug | hours ago | featured
export const DROPS: [string, string, string, string, string, string | null, number, boolean][] = [
  ['anjali.tapes', 'Munbe Vaa', 'Romantic', 'Some songs don’t age. They just wait for you to come back.', 'gold', 'old-songs-old-feelings', 1, false],
  ['dev.minor', 'Husn', 'Heartbroken', 'Learning that closure is something you give yourself.', 'ember', 'heartbreak-hotel', 2, false],
  ['mira.after', 'Somewhere Only We Know', 'Nostalgic', 'I don’t miss the person. I miss who I was when I knew them.', 'gold', null, 3, true],
  ['noor.fm', 'Cherathukal', 'Peaceful', 'Lamps lit, phone face down, nothing to prove tonight.', 'moss', 'sunday-slowdown', 4, false],
  ['theo.static', 'Weird Fishes/Arpeggi', 'Lost', 'Somewhere between who I was and who I’m supposed to be.', 'tide', null, 5, false],
  ['kabir.wav', 'Midnight City', 'Freedom', 'Driving without knowing where I’m going.', 'tide', 'the-drive-home', 6, true],
  ['zaid.afterdark', 'After Hours', 'Late Night', '3:12 am and the city finally sounds honest.', 'noir', 'r-and-b-after-dark', 7, false],
  ['lucia.sol', 'Dog Days Are Over', 'Euphoric', 'Ran the last block home just because my legs wanted to.', 'ember', null, 8, false],
  ['elle.cinema', 'Sweater Weather', 'Main Character', 'Today feels like the ending of a movie.', 'dusk', 'main-character-energy', 9, true],
  ['arjun.b.side', 'Thalli Pogathey', 'Restless', 'Typing the message. Deleting the message. Repeat.', 'dusk', null, 11, false],
  ['june.haze', 'Plastic Love', 'Nostalgic', 'Nostalgic for a decade I never lived in.', 'bloom', 'old-songs-old-feelings', 12, false],
  ['tara.2am', 'The Night We Met', 'Late Night', 'Some nights are better left unexplained.', 'noir', '2am-club', 14, true],
  ['mira.after', 'Kaathalae Kaathalae', 'Nostalgic', 'School corridors, ink-stained fingers, a name I never said out loud.', 'gold', 'old-songs-old-feelings', 16, false],
  ['karthik.kuthu', 'Enjoy Enjaami', 'Inspired', 'My grandmother’s stories had a bassline all along.', 'moss', 'tamil-indie-corner', 18, false],
  ['sana.rewinds', 'A Sky Full of Stars', 'Hopeful', 'Everything is changing, and somehow I’m okay with it.', 'bloom', null, 20, true],
  ['otis.blue', 'Blue in Green', 'Late Night', 'The trumpet says it better than I could.', 'noir', '2am-club', 22, false],
  ['meera.monsoon', 'Mizhiyil Ninnum', 'Melancholic', 'It rained all evening and I let it.', 'tide', 'after-the-rain', 26, false],
  ['felix.reverb', 'Let It Happen', 'Peaceful Chaos', 'Nothing is under control and I’ve never felt lighter.', 'haze', null, 28, true],
  ['rhea.unsent', 'good 4 u', 'Unbothered', 'Blocked, moisturised, thriving.', 'ember', 'heartbreak-hotel', 30, false],
  ['sam.slowdown', 'Landslide', 'Peaceful', 'Getting older is just collecting quieter mornings.', 'gold', 'sunday-slowdown', 34, false],
  ['vikram.vinyl', 'Dreams', 'Freedom', 'Highway, 6 am, no one awake to ask where I’m headed.', 'gold', 'the-drive-home', 38, false],
  ['elle.cinema', 'Experience', 'Main Character', 'Walked home the long way so the song could finish.', 'dusk', 'main-character-energy', 42, false],
  ['tara.2am', 'Slow Dancing in the Dark', 'Lonely', 'Everyone’s asleep and I’m the only tab still open.', 'noir', '2am-club', 46, false],
  ['kabir.wav', 'Choo Lo', 'Hopeful', 'Maybe starting over is just showing up again tomorrow.', 'moss', 'indie-souls', 50, false],
  ['noor.fm', 'Pink + White', 'Dreamy', 'The sky did that thing again and I forgot what I was upset about.', 'bloom', null, 55, false],
  ['dev.minor', 'On the Nature of Daylight', 'Melancholic', 'Grief is just love with nowhere to sit.', 'tide', 'after-the-rain', 60, true],
  ['sana.rewinds', 'august', 'Romantic', 'For the summers that were never really ours.', 'gold', null, 66, false],
  ['zaid.afterdark', 'Excuses', 'Unbothered', 'Read it. Smiled. Didn’t reply.', 'noir', 'r-and-b-after-dark', 72, false],
  ['arjun.b.side', 'Katchi Sera', 'Confident', 'New haircut. New problem for everyone else.', 'ember', 'tamil-indie-corner', 80, false],
  ['june.haze', 'Space Song', 'Dreamy', 'Fell asleep with this on and dreamt in slow motion.', 'haze', 'indie-souls', 90, false],
  ['anjali.tapes', 'Nuvole Bianche', 'Peaceful', 'Sunday, filter coffee, and nowhere to be.', 'moss', 'sunday-slowdown', 100, false],
  ['lucia.sol', 'Cruel Summer', 'Main Character', 'The bridge hit and I became unbearable.', 'bloom', 'main-character-energy', 110, false],
  ['theo.static', 'Teardrop', 'Late Night', 'Headphones on. World off.', 'noir', null, 120, false],
  ['meera.monsoon', 'Holocene', 'Peaceful', 'Small, in the best way.', 'moss', 'after-the-rain', 132, false],
  ['felix.reverb', 'Formidable', 'Peaceful Chaos', 'Laughing at the wrong moment and meaning it.', 'haze', null, 140, false],
  ['rhea.unsent', 'cold/mess', 'Heartbroken', 'I’d choose the mess again. That’s the worst part.', 'ember', 'heartbreak-hotel', 150, false],
  ['otis.blue', 'Best Part', 'Romantic', 'Made dinner for two. Played this for one.', 'gold', 'r-and-b-after-dark', 160, false],
  ['karthik.kuthu', 'Illuminati', 'Euphoric', 'Speakers blown. No regrets.', 'ember', null, 170, false],
  ['vikram.vinyl', 'Samajavaragamana', 'Romantic', 'Rewound the same thirty seconds eleven times.', 'bloom', null, 180, false],
  ['sam.slowdown', 'First Day of My Life', 'Hopeful', 'Some people feel like a window being opened.', 'gold', 'indie-souls', 200, false],
];

export interface RoomSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  c1: string;
  c2: string;
  motif: string;
  moods: string[];
  language?: string;
  genre?: string;
  talk: string[];
}

export const ROOMS: RoomSeed[] = [
  { slug: '2am-club', name: '2AM CLUB', tagline: 'For the ones still awake.', description: 'The lights are off, the phone is at 12%, and the song is on its fourth repeat. Nobody here will ask why you are up.', c1: '#7C6BD6', c2: '#151532', motif: 'moon', moods: ['Late Night', 'Lonely', 'Restless'], talk: ['What is the song you only play after midnight?', 'Roll call. Who is here and what are you avoiding?', 'There should be a word for the calm that shows up at 2:40.'] },
  { slug: 'heartbreak-hotel', name: 'HEARTBREAK HOTEL', tagline: 'Check in. Stay as long as you need.', description: 'Rooms available for the recently wrecked. Bring the song that says what you could not. No one will tell you to move on.', c1: '#B4506A', c2: '#2A1830', motif: 'door', moods: ['Heartbroken', 'Melancholic', 'Lonely'], talk: ['Which song did they ruin for you? Mine is still on my playlist out of spite.', 'Day 40. I listened to our song and only cried a little. Progress.', 'Recommend me something for the "I am fine" stage.'] },
  { slug: 'main-character-energy', name: 'MAIN CHARACTER ENERGY', tagline: 'Walk like it is being filmed.', description: 'For slow-motion entrances, rain on windows and end-credit walks home. Every post here should come with a tracking shot.', c1: '#E9C46A', c2: '#7A3550', motif: 'frame', moods: ['Main Character', 'Confident', 'Euphoric'], talk: ['What plays in the opening scene of your film?', 'Walked through the metro station with headphones on and felt directed.', 'End credits song. Go.'] },
  { slug: 'indie-souls', name: 'INDIE SOULS', tagline: 'Small rooms, big feelings.', description: 'Bedroom recordings, bands with eleven monthly listeners, and the song you found before anyone else did. Share generously.', c1: '#8FB8A8', c2: '#34405E', motif: 'rings', moods: ['Dreamy', 'Hopeful', 'Lost'], genre: 'indie', talk: ['Drop an artist under 100k listeners. I will go first.', 'Is it still indie if my mother knows the chorus?', 'Looking for something that sounds like an unmade bed in good light.'] },
  { slug: 'after-the-rain', name: 'AFTER THE RAIN', tagline: 'Petrichor, but make it audio.', description: 'Wet roads, clear air, the hush right after a storm. Songs for when something heavy has just passed.', c1: '#5E9C84', c2: '#243B55', motif: 'rain', moods: ['Peaceful', 'Melancholic', 'Hopeful'], talk: ['First rain of the season today. What are we playing?', 'There is a specific piano sound that feels like wet pavement.', 'Monsoon playlists are a love language.'] },
  { slug: 'sunday-slowdown', name: 'SUNDAY SLOWDOWN', tagline: 'Nothing to fix. Nowhere to be.', description: 'Late breakfasts, open windows, laundry in the sun. Music that does not ask anything of you.', c1: '#E9B15C', c2: '#7A5046', motif: 'sun', moods: ['Peaceful', 'Hopeful', 'Romantic'], talk: ['Coffee or chai, and what is on the speaker?', 'Protect your Sunday. Post your slowest song.', 'I made dosa and listened to one album start to finish. Recommend.'] },
  { slug: 'the-drive-home', name: 'THE DRIVE HOME', tagline: 'Take the long way.', description: 'For highways, ring roads, last buses and the extra lap around the block because the song is not over yet.', c1: '#6EC1E4', c2: '#3A2F66', motif: 'road', moods: ['Freedom', 'Nostalgic', 'Main Character'], talk: ['What is your "one more lap around the block" song?', 'ECR at sunrise with the windows down. That is the post.', 'Passenger seat DJs, state your credentials.'] },
  { slug: 'old-songs-old-feelings', name: 'OLD SONGS, OLD FEELINGS', tagline: 'Some songs are rooms you used to live in.', description: 'Cassette rewinds, school-bus radios, your parents’ favourites. Bring the song and the memory it is attached to.', c1: '#C89B6D', c2: '#4E3558', motif: 'vinyl', moods: ['Nostalgic', 'Romantic', 'Melancholic'], talk: ['Which song instantly makes you ten years old?', 'My father hums one interlude every morning. I finally found which song it is.', 'The 2000s Harris era deserves its own museum.'] },
  { slug: 'tamil-indie-corner', name: 'TAMIL INDIE CORNER', tagline: 'Namma sound, new voices.', description: 'Independent Tamil music and everything orbiting it. New singles, old favourites, and the bands playing your city this month.', c1: '#F26B4E', c2: '#5B2A58', motif: 'wave', moods: ['Inspired', 'Confident', 'Romantic'], language: 'Tamil', talk: ['Who is the most underrated Tamil indie voice right now?', 'Indie or film, a good Tamil melody still wins every time.', 'Share the last Tamil song that surprised you.'] },
  { slug: 'r-and-b-after-dark', name: 'R&B AFTER DARK', tagline: 'Low lights. Good speakers.', description: 'Slow grooves, falsettos and basslines that feel like velvet. Strictly for after sunset.', c1: '#F0A6C8', c2: '#3B2456', motif: 'bars', moods: ['Romantic', 'Late Night', 'Unbothered'], genre: 'R&B', talk: ['Best opening ten seconds in R&B. No wrong answers, only better ones.', 'Tonight’s rotation is entirely falsetto.', 'A song for cooking dinner slowly on purpose?'] },
];

// title | description | mood filter | language filter | max popularity
export const PLAYLISTS: [string, string, string | null, string | null, number | null][] = [
  ['after hours', 'For the hours that do not belong to any day.', 'Late Night', null, null],
  ['old versions of me', 'A rewind, handled gently.', 'Nostalgic', null, null],
  ['soft heavy', 'Blue, but beautifully.', 'Melancholic', null, null],
  ['nowhere to be', 'Lower your shoulders. Stay a while.', 'Peaceful', null, null],
  ['the last chorus', 'Clear some floor space.', 'Euphoric', null, null],
  ['unsent', 'Everything you typed and deleted.', 'Heartbroken', null, null],
  ['leaning in', 'Warm lights, slow hands.', 'Romantic', null, null],
  ['soft focus', 'Half here. Half somewhere softer.', 'Dreamy', null, null],
  ['tracking shot', 'Walk like it is being filmed.', 'Main Character', null, null],
  ['windows down', 'Destination optional.', 'Freedom', null, null],
  ['kaadhal, mostly', 'Tamil love songs for every stage of it.', 'Romantic', 'Tamil', null],
  ['dil ki baat', 'Hindi songs that say the quiet part.', null, 'Hindi', null],
  ['no words needed', 'Instrumentals that will not talk over your thoughts.', null, 'Instrumental', null],
  ['under the radar', 'Sample-catalogue gems that deserve more ears.', null, null, 84],
  ['monsoon, kerala', 'Malayalam melodies for grey skies.', null, 'Malayalam', null],
];

export const COMMENTS = [
  'This caption just read me for filth.', 'Saving this for the next time I can’t explain myself.', 'The way this song still works every single time.', 'Okay but why is this exactly my week.',
  'Adding to my 2am rotation immediately.', 'I felt this in a place I don’t have a name for.', 'First ten seconds and I’m already gone.', 'You always find the right one.',
  'This was on repeat my entire second year.', 'Needed this today. Thank you.', 'The bridge. THE BRIDGE.', 'Who gave you permission to post my diary.',
  'Listening now. It is raining here, which helps.', 'Sent this to someone without context.', 'Song and caption both on point.', 'I forgot how good this was.',
  'Never heard this before and now it’s all I’ll play.', 'Quietly devastating. Love it.', 'This is what the inside of my head sounds like.', 'Putting my phone down and just listening.',
];
