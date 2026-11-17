/** Language data for the rule-based Mood AI engine: keyword lexicons, questions and voice lines. */

export const MOOD_LEXICON: Record<string, string[]> = {
  Nostalgic: ['nostalg', 'old times', 'old days', 'memories', 'memory', 'remember', 'childhood', 'used to', 'back then', 'throwback', 'school days', 'college days', 'old songs', 'reminisc', 'good old', 'simpler times', 'home town', 'hometown', 'grew up'],
  Melancholic: ['sad', 'feeling down', 'feel down', 'blue', 'melanchol', 'heavy', 'feeling low', 'feel low', 'gloomy', 'crying', 'cry', 'tears', 'depress', 'grief', 'grieving', 'upset', 'hurting', 'bad day', 'rough day', 'awful', 'terrible', 'miserable', 'unhappy'],
  Peaceful: ['calm', 'peace', 'relax', 'chill', 'quiet', 'gentle', 'unwind', 'serene', 'cozy', 'cosy', 'slow morning', 'sunday', 'breathe', 'tired', 'exhaust', 'drained', 'sleepy', 'burnt out', 'burned out', 'rest', 'soothing', 'meditat'],
  Euphoric: ['happy', 'euphor', 'excited', 'ecstatic', 'amazing', 'best day', 'celebrat', 'party', 'dance', 'dancing', 'top of the world', 'hyped', 'joy', 'thrilled', 'good news', 'great day', 'on a high', 'elated'],
  Heartbroken: ['heartbr', 'breakup', 'broke up', 'break up', 'broken up', 'my ex', 'dumped', 'left me', 'cheated', 'miss her', 'miss him', 'miss them', 'moving on', 'get over', 'heartache', 'rejected', 'unrequited', 'she left', 'he left', 'they left'],
  Romantic: ['in love', 'love', 'crush', 'romantic', 'romance', 'date night', 'butterflies', 'kiss', 'falling for', 'someone special', 'valentine', 'my girlfriend', 'my boyfriend', 'my partner', 'anniversary'],
  Dreamy: ['dream', 'float', 'hazy', 'spacey', 'ethereal', 'daydream', 'clouds', 'soft focus', 'zoning out', 'zoned out', 'spaced out', 'surreal'],
  Confident: ['confident', 'boss', 'powerful', 'unstoppable', 'gym', 'workout', 'swagger', 'bold', 'hype me', 'slay', 'winning', 'bad bitch', 'baddie', 'pumped', 'ready to go', 'interview', 'big day', 'fearless'],
  Lonely: ['lonely', 'alone', 'isolated', 'no one', 'nobody', 'by myself', 'homesick', 'miss my friends', 'miss home', 'left out', 'invisible', 'far from home'],
  'Main Character': ['main character', 'movie', 'cinematic', 'film', 'protagonist', 'slow motion', 'end credits', 'montage', 'walking through the city', 'like a scene', 'soundtrack to my life', 'dramatic'],
  Restless: ['restless', 'anxious', 'anxiety', 'overthink', "can't sleep", 'cant sleep', 'cannot sleep', 'insomnia', 'wired', 'on edge', 'stressed', 'stress', 'jittery', 'racing', 'bored', 'angry', 'frustrat', 'annoyed', 'pissed', 'irritat', 'nervous', 'fidgety', 'mad at'],
  Hopeful: ['hope', 'new beginning', 'fresh start', 'better days', 'healing', 'optimis', 'things are changing', 'starting over', 'sunrise', 'new chapter', 'getting better', 'looking forward', 'new job', 'new city'],
  'Late Night': ['late night', '2am', '3am', '2 am', '3 am', '4am', 'midnight', 'night drive', 'after hours', 'up late', 'still awake', "can't sleep", 'cant sleep', 'insomnia', 'night owl', 'tonight'],
  Unbothered: ['unbothered', "don't care", 'dont care', 'carefree', 'no worries', 'over it', 'moved on', 'indifferent', 'whatever happens', 'easy going', 'easygoing', 'not bothered', 'vibing', 'vibe'],
  Freedom: ['free', 'freedom', 'road trip', 'roadtrip', 'driving', 'highway', 'escape', 'run away', 'windows down', 'travel', 'wander', 'open road', 'vacation', 'holiday', 'adventure', 'quit my job'],
  Lost: ['lost', 'confused', 'directionless', 'stuck', "don't know who", 'what am i doing', 'numb', 'empty', 'just existing', 'existing', 'purposeless', 'in between', 'in-between', 'drifting', 'meh', 'blank'],
  Inspired: ['inspir', 'creative', 'motivat', 'focus', 'ambitio', 'productive', 'work mode', 'deep work', 'studying', 'study', 'writing', 'painting', 'coding', 'building', 'in the zone', 'flow state'],
  'Peaceful Chaos': ['chaos', 'chaotic', 'messy', 'everything at once', 'overwhelm', 'mixed feelings', 'bittersweet', 'all over the place', 'a lot going on', 'too much', 'happy and sad', 'everything is changing'],
};

export interface Situation {
  key: string;
  words: string[];
  mood: string;
  blend?: string;
  energy: number;
  line: string;
  instrumental?: boolean;
}

export const SITUATIONS: Situation[] = [
  { key: 'drive', words: ['driving', 'drive', 'road', 'car', 'highway', 'bike ride', 'riding'], mood: 'Freedom', blend: 'Main Character', energy: 4, line: 'A drive needs songs that make the road feel longer than it is.' },
  { key: 'study', words: ['study', 'studying', 'exam', 'homework', 'reading', 'revision', 'assignment'], mood: 'Inspired', blend: 'Peaceful', energy: 2, line: 'For studying: enough movement to keep you company, not enough to steal the sentence you are reading.', instrumental: true },
  { key: 'work', words: ['work', 'working', 'coding', 'code', 'office', 'deadline', 'writing', 'focus', 'desk'], mood: 'Inspired', blend: 'Dreamy', energy: 3, line: 'Work music should feel like a second cup of coffee, not a meeting.', instrumental: true },
  { key: 'gym', words: ['gym', 'workout', 'run', 'running', 'lifting', 'exercise', 'training', 'jog'], mood: 'Confident', blend: 'Euphoric', energy: 5, line: 'Okay. We are not here to be gentle.' },
  { key: 'rain', words: ['rain', 'raining', 'monsoon', 'storm', 'drizzle', 'cloudy'], mood: 'Melancholic', blend: 'Peaceful', energy: 2, line: 'Rain already did half the work. I am just adding strings.' },
  { key: 'cook', words: ['cook', 'cooking', 'kitchen', 'cleaning', 'chores', 'laundry', 'baking'], mood: 'Unbothered', blend: 'Euphoric', energy: 4, line: 'Kitchen music has one job: make you dance with a spoon in your hand.' },
  { key: 'walk', words: ['walk', 'walking', 'stroll', 'commute', 'train', 'bus', 'metro', 'flight', 'airport', 'travelling', 'traveling'], mood: 'Main Character', blend: 'Dreamy', energy: 3, line: 'In transit, everyone is the lead in their own film. Here is your score.' },
  { key: 'sleep', words: ['sleep', 'bed', 'falling asleep', 'wind down', 'winding down', 'nap', 'lying down', 'horizontal'], mood: 'Peaceful', blend: 'Dreamy', energy: 1, line: 'Nothing here will ask anything of you.' },
  { key: 'party', words: ['party', 'friends over', 'pregame', 'pre-game', 'getting ready', 'night out', 'club'], mood: 'Euphoric', blend: 'Confident', energy: 5, line: 'Getting-ready music is its own genre and I take it seriously.' },
  { key: 'shower', words: ['shower', 'bath'], mood: 'Unbothered', blend: 'Main Character', energy: 4, line: 'Shower acoustics deserve a real chorus.' },
  { key: 'morning', words: ['morning', 'waking up', 'woke up', 'breakfast', 'coffee', 'chai', 'sunrise'], mood: 'Hopeful', blend: 'Peaceful', energy: 2, line: 'Mornings should be eased into. No sudden movements.' },
  { key: 'date', words: ['date', 'dinner', 'candle', 'someone over', 'cuddle'], mood: 'Romantic', blend: 'Late Night', energy: 2, line: 'Low lights, good speakers. I understand the assignment.' },
];

export const VAGUE = ['anything', 'whatever', 'idk', "i don't know", 'i dont know', 'dont know', "don't know", 'not sure', 'no idea', 'you choose', 'you pick', 'you decide', 'up to you', 'dunno', 'nothing', 'no clue', 'something', 'play something', 'any', 'hmm', 'um', 'umm'];
export const SURPRISE = ['surprise me', 'surprise', 'random', 'dealer', 'shuffle', 'wildcard', 'wild card'];
export const DIFFERENT = ['something different', 'something new', 'something else', 'never heard', 'not my usual', 'out of my comfort', 'unusual', 'unexpected', 'different'];

export const LANGUAGE_WORDS: Record<string, string[]> = {
  Tamil: ['tamil', 'kollywood', 'kuthu'],
  Hindi: ['hindi', 'bollywood'],
  Malayalam: ['malayalam', 'mollywood'],
  Telugu: ['telugu', 'tollywood'],
  Punjabi: ['punjabi'],
  Korean: ['korean', 'k-pop', 'kpop'],
  Japanese: ['japanese', 'city pop'],
  Spanish: ['spanish', 'latin'],
  French: ['french'],
  English: ['english'],
  Instrumental: ['instrumental', 'no lyrics', 'no words', 'without lyrics'],
};

export const GENRE_WORDS: Record<string, string[]> = {
  indie: ['indie'],
  pop: ['pop'],
  rock: ['rock', 'guitar'],
  'R&B': ['r&b', 'rnb', 'r and b', 'soul'],
  'hip-hop': ['hip-hop', 'hip hop', 'rap'],
  electronic: ['electronic', 'edm', 'synth', 'house', 'techno'],
  classical: ['classical', 'piano', 'orchestra', 'strings'],
  jazz: ['jazz', 'sax'],
  alternative: ['alternative', 'alt '],
  film: ['film music', 'soundtrack', 'movie songs', 'film songs'],
};

/** Follow-up questions that add texture to a mood. Each option blends in a second mood and nudges energy. */
export interface Flavour {
  q: string[];
  options: { label: string; keys: string[]; blend: string; energy: number; echo: string }[];
}

export const FLAVOURS: Record<string, Flavour> = {
  Nostalgic: {
    q: ['Old memories or old versions of yourself?', 'Nostalgic for a place, a person, or a version of you?', 'Is this the warm kind of remembering, or the kind that aches a little?'],
    options: [
      { label: 'Old memories', keys: ['memor', 'place', 'time', 'days', 'people', 'friends', 'warm', 'person', 'home', 'school', 'college'], blend: 'Romantic', energy: 0, echo: 'Old memories, then. The kind that still smell like a specific summer.' },
      { label: 'Old versions of me', keys: ['version', 'myself', 'who i was', 'me', 'self', 'ache', 'used to be', 'younger'], blend: 'Lost', energy: -0.5, echo: 'Old versions of you. They are still in there somewhere, humming along.' },
    ],
  },
  Melancholic: {
    q: ['Is it the heavy kind of sad, or the soft, almost-comfortable kind?', 'Does this sadness have a reason, or did it just show up?'],
    options: [
      { label: 'Heavy', keys: ['heavy', 'bad', 'deep', 'reason', 'a lot', 'really', 'worst', 'hard'], blend: 'Heartbroken', energy: -0.5, echo: 'Heavy. Okay. I will not try to talk you out of it.' },
      { label: 'Soft and quiet', keys: ['soft', 'quiet', 'comfortable', 'showed up', 'no reason', 'gentle', 'just', 'light', 'mild'], blend: 'Peaceful', energy: -0.5, echo: 'The quiet kind. It just wants somewhere to sit for a while.' },
    ],
  },
  Peaceful: {
    q: ['Peaceful like a slow morning, or peaceful like the world finally went quiet at night?', 'Do you want stillness, or something that gently sways?'],
    options: [
      { label: 'Slow morning', keys: ['morning', 'sun', 'light', 'day', 'sway', 'warm', 'gentle'], blend: 'Hopeful', energy: 0.5, echo: 'Slow morning light. Unhurried on purpose.' },
      { label: 'Quiet night', keys: ['night', 'quiet', 'still', 'dark', 'late', 'silence'], blend: 'Late Night', energy: -0.5, echo: 'The world gone quiet. Good. Let us not disturb it.' },
    ],
  },
  Euphoric: {
    q: ['Is this a dance-around-the-room high, or a quiet glowing one?', 'Do you want to celebrate out loud, or just keep the feeling going?'],
    options: [
      { label: 'Dance around the room', keys: ['dance', 'loud', 'celebrat', 'party', 'room', 'out loud', 'big', 'jump'], blend: 'Confident', energy: 0.5, echo: 'Volume up. Neighbours can deal.' },
      { label: 'Quiet glow', keys: ['quiet', 'glow', 'keep', 'soft', 'calm', 'going', 'warm'], blend: 'Hopeful', energy: -1, echo: 'A quiet glow. Let us not spill any of it.' },
    ],
  },
  Heartbroken: {
    q: ['Do you want to sit inside it for a while, or be walked gently out?', 'Is this a "let me cry" night or a "remind me who I am" night?'],
    options: [
      { label: 'Sit in it', keys: ['sit', 'inside', 'stay', 'cry', 'feel it', 'wallow', 'in it', 'let me'], blend: 'Melancholic', energy: -0.5, echo: 'Then we stay. No rush, no silver linings yet.' },
      { label: 'Walk me out', keys: ['walk', 'out', 'remind', 'who i am', 'move on', 'better', 'up', 'over'], blend: 'Hopeful', energy: 1, echo: 'Alright. One foot, then the other. I will keep the tempo honest.' },
    ],
  },
  Romantic: {
    q: ['New-crush butterflies, or the settled, deep kind?', 'Is this love that is here, or love you are hoping for?'],
    options: [
      { label: 'Butterflies', keys: ['crush', 'butterfl', 'new', 'hoping', 'maybe', 'giddy', 'nervous', 'first'], blend: 'Dreamy', energy: 0.5, echo: 'Butterflies. The best kind of unwell.' },
      { label: 'Deep and settled', keys: ['deep', 'settled', 'here', 'long', 'real', 'steady', 'years', 'home'], blend: 'Peaceful', energy: -0.5, echo: 'The settled kind. Love that has taken its shoes off.' },
    ],
  },
  Dreamy: {
    q: ['Floating upward, or dissolving a little?', 'Do you want the dream to be bright or blurry?'],
    options: [
      { label: 'Floating', keys: ['float', 'up', 'bright', 'light', 'sky'], blend: 'Hopeful', energy: 0.5, echo: 'Floating it is. Feet optional.' },
      { label: 'Dissolving', keys: ['dissolv', 'blur', 'fade', 'melt', 'sink', 'hazy'], blend: 'Late Night', energy: -0.5, echo: 'Soft edges. Let everything blur for a bit.' },
    ],
  },
  Confident: {
    q: ['Quiet confidence, or kick-the-door-open confidence?', 'Are we walking in calm, or walking in loud?'],
    options: [
      { label: 'Kick the door open', keys: ['kick', 'door', 'loud', 'big', 'hype', 'aggressive', 'hard'], blend: 'Euphoric', energy: 0.5, echo: 'Door, meet foot.' },
      { label: 'Quiet confidence', keys: ['quiet', 'calm', 'smooth', 'cool', 'subtle', 'easy'], blend: 'Unbothered', energy: -1, echo: 'The quiet kind. Nothing to prove, which proves everything.' },
    ],
  },
  Lonely: {
    q: ['Do you want company for the loneliness, or a little distance from it?', 'Is it missing someone specific, or just missing being known?'],
    options: [
      { label: 'Company in it', keys: ['company', 'stay', 'specific', 'someone', 'with it', 'sit'], blend: 'Melancholic', energy: -0.5, echo: 'Then here are some voices that sound like they are in the room.' },
      { label: 'A little distance', keys: ['distance', 'away', 'known', 'distract', 'lighter', 'lift', 'out'], blend: 'Hopeful', energy: 0.5, echo: 'A little lift, then. Nothing forced.' },
    ],
  },
  'Main Character': {
    q: ['Opening scene, or end credits?', 'Is this a walking-through-the-city montage or a staring-out-the-window one?'],
    options: [
      { label: 'Opening scene', keys: ['opening', 'start', 'city', 'walk', 'beginning', 'montage', 'intro'], blend: 'Confident', energy: 0.5, echo: 'Opening scene. The title card just hit.' },
      { label: 'End credits', keys: ['end', 'credits', 'window', 'ending', 'final', 'last', 'staring'], blend: 'Nostalgic', energy: -0.5, echo: 'End credits. Everyone has changed a little. Roll them slowly.' },
    ],
  },
  Restless: {
    q: ['Do you want to burn the energy off, or be talked down from it?', 'Should the music match the buzz, or slow your pulse?'],
    options: [
      { label: 'Burn it off', keys: ['burn', 'match', 'off', 'move', 'run', 'loud', 'fast', 'angry', 'release'], blend: 'Confident', energy: 1, echo: 'Then we use it. Something with teeth.' },
      { label: 'Talk me down', keys: ['down', 'slow', 'calm', 'pulse', 'breathe', 'settle', 'quiet', 'sleep'], blend: 'Peaceful', energy: -1.5, echo: 'Okay. Unclench your jaw. I will take it from here.' },
    ],
  },
  Hopeful: {
    q: ['Is it a quiet, fragile hope, or the kind you want to shout about?', 'Hope after something hard, or hope for something new?'],
    options: [
      { label: 'Quiet and fragile', keys: ['quiet', 'fragile', 'after', 'hard', 'small', 'careful', 'soft'], blend: 'Peaceful', energy: -0.5, echo: 'Fragile hope. We will hold it carefully.' },
      { label: 'Out loud', keys: ['shout', 'loud', 'new', 'big', 'excited', 'out'], blend: 'Euphoric', energy: 1, echo: 'Out loud, then. You have earned the chorus.' },
    ],
  },
  'Late Night': {
    q: ['Is this a thinking-too-much night, or a nobody-knows-I-am-awake night?', 'Late and lonely, or late and electric?'],
    options: [
      { label: 'Thinking too much', keys: ['think', 'lonely', 'overthink', 'mind', 'too much', 'sad', 'feel'], blend: 'Lonely', energy: -0.5, echo: 'The thoughts are louder after midnight. Let us give them a bassline.' },
      { label: 'Awake and electric', keys: ['electric', 'awake', 'nobody', 'alive', 'city', 'neon', 'drive', 'good'], blend: 'Freedom', energy: 1, echo: 'The good kind of awake. The city belongs to whoever is still up.' },
    ],
  },
  Unbothered: {
    q: ['Genuinely unbothered, or practising?', 'Sunny unbothered, or cool-and-detached unbothered?'],
    options: [
      { label: 'Genuinely', keys: ['genuine', 'really', 'sunny', 'truly', 'actually', 'good'], blend: 'Euphoric', energy: 0.5, echo: 'Genuinely fine. Rare. Let us protect it.' },
      { label: 'Practising', keys: ['practis', 'practic', 'trying', 'fake', 'cool', 'detached', 'pretend'], blend: 'Confident', energy: 0, echo: 'Practising counts. Fake it with a good bassline.' },
    ],
  },
  Freedom: {
    q: ['Running toward something, or away from something?', 'Open-highway freedom, or dancing-alone-in-your-room freedom?'],
    options: [
      { label: 'Running toward', keys: ['toward', 'to something', 'highway', 'road', 'open', 'ahead', 'new'], blend: 'Hopeful', energy: 0.5, echo: 'Toward. Good. Eyes on the horizon.' },
      { label: 'Running away', keys: ['away', 'from', 'escape', 'leave', 'room', 'alone', 'out'], blend: 'Restless', energy: 0.5, echo: 'Away is a direction too. Let us put some distance in.' },
    ],
  },
  Lost: {
    q: ['Lost like drifting, or lost like searching?', 'Do you want to float in it, or find a thread to follow?'],
    options: [
      { label: 'Drifting', keys: ['drift', 'float', 'nothing', 'numb', 'existing', 'blank', 'empty'], blend: 'Dreamy', energy: -0.5, echo: 'Drifting. Then we will not steer. Just a soft current.' },
      { label: 'Searching', keys: ['search', 'thread', 'find', 'looking', 'answer', 'direction', 'follow'], blend: 'Hopeful', energy: 0.5, echo: 'Searching means some part of you expects to find it.' },
    ],
  },
  Inspired: {
    q: ['Do you need focus, or fire?', 'Background momentum, or something that makes you want to start right now?'],
    options: [
      { label: 'Focus', keys: ['focus', 'background', 'concentrat', 'steady', 'calm', 'momentum'], blend: 'Peaceful', energy: -1, echo: 'Focus. Steady hands. I will keep the tempo out of your way.' },
      { label: 'Fire', keys: ['fire', 'start', 'now', 'energy', 'push', 'big', 'go'], blend: 'Confident', energy: 1, echo: 'Fire. Go make the thing.' },
    ],
  },
  'Peaceful Chaos': {
    q: ['Do you want music that matches the mess, or holds it together?', 'More chaos, or more peace?'],
    options: [
      { label: 'Match the mess', keys: ['match', 'mess', 'chaos', 'more chaos', 'loud', 'wild'], blend: 'Restless', energy: 0.5, echo: 'We lean in. Controlled demolition.' },
      { label: 'Hold it together', keys: ['hold', 'together', 'peace', 'calm', 'steady', 'ground'], blend: 'Peaceful', energy: -1, echo: 'Something steady to stand on while everything else moves.' },
    ],
  },
};

export const OPENERS = ["Tell me what's going on. Or don't. We can figure out the soundtrack together."];

export const STYLE_OPENERS: Record<string, string[]> = {
  quick: ['Give me one line. A word, a place, a time of day. I will do the rest.', 'One word is enough. What are we scoring?'],
  casual: ["Tell me what's going on. Or don't. We can figure out the soundtrack together."],
  deep: ['No rush here. Start anywhere: the day, the person, the weather inside your head.', 'We can take the long way round. What has been sitting with you lately?'],
  situational: ['Set the scene for me. Where are you, and what are you doing?', 'Tell me the moment: driving, studying, cooking, not sleeping?'],
};

export const TIME_PROBE: Record<string, string[]> = {
  night: ['What kind of night are we having?', 'It is late enough for honesty. What kind of night is this?'],
  evening: ['What kind of evening are we having?', 'The day is winding down. How did it leave you?'],
  day: ['What kind of day are we having?', 'How is today sitting with you so far?'],
  morning: ['What kind of morning are we having?', 'It is early. Easing in, or already running?'],
};

export const VAGUE_REPLIES = [
  'Anything is a dangerous answer. Are we feeling nostalgic, peaceful, restless or just existing?',
  '"Anything" is how people end up crying to a song at a traffic light. Narrow it for me: nostalgic, peaceful, restless, or just existing?',
  'I could pick at random, but you deserve better. Closest one: nostalgic, peaceful, restless, or just existing?',
];

export const UNKNOWN_REPLIES = [
  'I want to get this right. If that feeling had a weather, what would it be: clear, overcast, stormy, or fog?',
  'Help me hear it. Is this closer to heavy, restless, soft, or bright?',
  'I am listening. Would you call it more of an ache, a buzz, a calm, or a glow?',
];

export const EXISTING_REPLIES = ['I think I know the feeling. Let\'s find something for that.', 'Just existing is underrated. Let me find something that asks nothing of you.', 'Not good, not bad, just here. I know the exact shelf.'];

export const ENERGY_Q = ['Should this sit quietly with you, or move you a little?', 'How much motion can you handle right now: barely any, some, or a lot?'];
export const INTENSITY_Q = ['Honestly, how loud is this feeling: a background hum, or taking up the whole room?', 'On the inside, is this a whisper or a wall of sound?'];
export const COMPANY_Q = ['Alone, or are other people around?', 'Is this just for you in headphones, or is the room listening too?'];

export const INTROS: Record<string, string[]> = {
  Nostalgic: ['Here is where I would go back to.', 'These all sound like a photograph you forgot you kept.'],
  Melancholic: ['None of these will try to fix it. They will just sit beside you.', 'Blue, but beautifully.'],
  Peaceful: ['Nothing here is in a hurry.', 'Lower your shoulders. These will do the rest.'],
  Euphoric: ['Clear some floor space.', 'These should keep the feeling in the air a little longer.'],
  Heartbroken: ['I am sorry it is that kind of night. These understand.', 'For the love that still has nowhere to go.'],
  Romantic: ['Warm lights, slow hands.', 'Every one of these sounds like someone leaning in.'],
  Dreamy: ['Soft focus, from here on.', 'These do not really start or end. They just drift in.'],
  Confident: ['Walk in like the chorus just hit.', 'Shoulders back. Press play.'],
  Lonely: ['A few voices to keep the room from feeling so empty.', 'You are not the only one awake. These prove it.'],
  'Main Character': ['Camera is rolling. Here is your score.', 'Put your headphones in and walk like it is being filmed.'],
  Restless: ['For a mind that will not sit down.', 'Let us give all that static somewhere to go.'],
  Hopeful: ['Light, getting in around the edges.', 'These lean toward morning.'],
  'Late Night': ['For the hours that do not count as today or tomorrow.', 'The city is asleep. This is what it sounds like when you are not.'],
  Unbothered: ['Zero stakes. Maximum ease.', 'These shrug beautifully.'],
  Freedom: ['Windows down. Destination optional.', 'These all sound like leaving, in the best way.'],
  Lost: ['You do not need the map yet. Just a current to float on.', 'For the in-between. It is a real place, and people write songs there.'],
  Inspired: ['The feeling right before you make something.', 'Fuel, not wallpaper.'],
  'Peaceful Chaos': ['Everything is happening, and somehow it is fine.', 'A soundtrack for holding five feelings at once.'],
};

export const WHY: Record<string, string[]> = {
  Nostalgic: ['{title} has that worn-photograph warmth, like a memory you can stand inside.', 'There is a rewind built into {title}; {artist} makes the past feel close enough to touch.'],
  Melancholic: ['{title} lets the sadness be exactly what it is, without rushing you through it.', '{artist} keeps {title} in the minor key and never apologises for it.'],
  Peaceful: ['{title} leaves a lot of air between the notes. It asks nothing of you.', '{title} moves like a slow exhale.'],
  Euphoric: ['{title} is built around a lift-off moment, and it delivers every time.', 'There is no sitting still through {title}. {artist} wrote it for the top of the feeling.'],
  Heartbroken: ['{title} says the part you never sent.', '{artist} sounds like someone who has stood exactly where you are standing in {title}.'],
  Romantic: ['{title} feels like someone leaning in to say something quietly.', 'There is a slow-burn warmth in {title} that does not try too hard.'],
  Dreamy: ['{title} blurs at the edges; it sounds half-remembered even on first listen.', '{artist} wraps {title} in enough haze to float in.'],
  Confident: ['{title} walks in before you do.', 'The swagger in {title} is contagious, which is the whole point.'],
  Lonely: ['{title} sounds like it was sung to one person. Tonight that is you.', '{artist} makes solitude feel shared in {title}.'],
  'Main Character': ['{title} turns an ordinary walk into a tracking shot.', 'The build in {title} is pure cinema; you will want to stare out of a window.'],
  Restless: ['{title} has the same unsettled pulse, which makes it strangely calming.', '{title} keeps moving so you do not have to.'],
  Hopeful: ['{title} resolves upward. It leaves a window open.', 'There is morning light in {title}, even in its quiet parts.'],
  'Late Night': ['{title} is at its best after midnight, when there is nothing left to perform.', '{artist} made {title} for empty roads and lit windows.'],
  Unbothered: ['{title} has nowhere to be and it shows.', 'Nothing in {title} is trying too hard, and it is better for it.'],
  Freedom: ['{title} sounds like distance being covered.', 'The chorus of {title} opens up like a road after the last traffic light.'],
  Lost: ['{title} does not pretend to have answers, and that is the comfort.', '{title} drifts, and lets you drift with it.'],
  Inspired: ['{title} has that forward lean, like an idea arriving.', '{artist} builds {title} piece by piece; it makes you want to build too.'],
  'Peaceful Chaos': ['{title} holds a lot at once and somehow stays balanced.', '{title} is messy in the way real days are, and still lands softly.'],
};

export const PLAYLIST_TITLES: Record<string, string[]> = {
  Nostalgic: ['old versions of me', 'rewind, gently', 'the long way back'],
  Melancholic: ['blue, but beautifully', 'soft heavy', 'let it be sad'],
  Peaceful: ['nowhere to be', 'slow exhale', 'the quiet part'],
  Euphoric: ['the last chorus', 'floor space', 'keep it in the air'],
  Heartbroken: ['unsent', 'nowhere for the love to go', 'the after'],
  Romantic: ['leaning in', 'slow hands, warm light', 'stay a while'],
  Dreamy: ['soft focus', 'half asleep, fully feeling', 'cloud inventory'],
  Confident: ['walk in', 'the entrance', 'no notes'],
  Lonely: ['night radio', 'company for the quiet hours', 'someone else is awake'],
  'Main Character': ['tracking shot', 'end credits', 'the camera loves you'],
  Restless: ['open tabs', 'static', 'cannot sit down'],
  Hopeful: ['first light', 'window left open', 'things are changing'],
  'Late Night': ['after hours', '2:47am', 'lit windows'],
  Unbothered: ['not my circus', 'easy exit', 'zero stakes'],
  Freedom: ['windows down', 'destination optional', 'the long road'],
  Lost: ['just existing', 'before the map', 'the in-between'],
  Inspired: ['sketchbook', 'forward lean', 'make the thing'],
  'Peaceful Chaos': ['beautiful mess', 'five feelings at once', 'everything, softly'],
};

export const CAPTIONS: Record<string, string[]> = {
  Nostalgic: ['Some songs are just rooms I used to live in.', 'I heard this and was nineteen again for three minutes.'],
  Melancholic: ['Not sad about anything. Just sad near everything.', 'Letting this one be heavy tonight.'],
  Peaceful: ['Nothing to fix. Nowhere to be.', 'The world got quiet and I let it.'],
  Euphoric: ['If you need me, I will be in the chorus.', 'Good news looks good on me.'],
  Heartbroken: ['This song is saying what I could not.', 'Still learning how to miss someone politely.'],
  Romantic: ['You, mostly.', 'This one sounds like the way you look at me.'],
  Dreamy: ['Half here. Half somewhere softer.', 'Do not wake me, I am listening.'],
  Confident: ['Walked in like the chorus just hit.', 'No notes. Only volume.'],
  Lonely: ['Someone else is awake somewhere, listening to this too.', 'Company for the quiet hours.'],
  'Main Character': ['Today feels like it is being filmed.', 'The walk home had a score tonight.'],
  Restless: ['My mind has forty tabs open and they are all playing this.', 'Cannot sit still. Will not try.'],
  Hopeful: ['Something is changing and for once I am not afraid of it.', 'Light, getting in around the edges.'],
  'Late Night': ['The city is asleep. I am not.', 'Some hours do not belong to any day.'],
  Unbothered: ['Not my circus. Not my playlist.', 'Peace was an option, so I took it.'],
  Freedom: ['Windows down. Destination optional.', 'Left without telling anyone where.'],
  Lost: ['Just existing, with a soundtrack.', 'No map yet. Good song though.'],
  Inspired: ['The feeling right before you make something.', 'Listening to this like it is fuel.'],
  'Peaceful Chaos': ['Everything is happening, and somehow it is fine.', 'Five feelings at once. This song holds all of them.'],
};

export const THANKS = ['thanks', 'thank you', 'thx', 'perfect', 'love it', 'love these', 'great', 'nice', 'good one', 'these are good', 'awesome'];
export const THANKS_REPLIES = ['Anytime. If one of these lands, it might be worth turning into a Mood Drop.', 'Good. Come back when the feeling changes. It always does.', 'That is all I wanted. Save the ones that stick.'];
