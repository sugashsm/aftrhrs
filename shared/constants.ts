// Shared between server and client. No secrets live here.

export interface MoodDef {
  name: string;
  c1: string;
  c2: string;
  energy: number; // default energy 1..5
  line: string;
}

export const MOODS: MoodDef[] = [
  { name: 'Nostalgic', c1: '#C89B6D', c2: '#6B4F7A', energy: 2.5, line: 'for the rooms you can only visit in memory' },
  { name: 'Melancholic', c1: '#5E7CA8', c2: '#2B2F4A', energy: 2, line: 'a soft, blue kind of heavy' },
  { name: 'Peaceful', c1: '#8FB8A8', c2: '#3D5A6C', energy: 1.5, line: 'nothing to fix, nowhere to be' },
  { name: 'Euphoric', c1: '#F4B860', c2: '#E86A92', energy: 4.5, line: 'the volume your heart is asking for' },
  { name: 'Heartbroken', c1: '#B4506A', c2: '#3A2340', energy: 2, line: 'for the love that has nowhere to go' },
  { name: 'Romantic', c1: '#F0A6C8', c2: '#8E5A9E', energy: 2.5, line: 'slow-burn, warm-light, stay-a-while' },
  { name: 'Dreamy', c1: '#C4B5FD', c2: '#6D83C9', energy: 2, line: 'half here, half somewhere softer' },
  { name: 'Confident', c1: '#F26B4E', c2: '#7A2E5C', energy: 4.5, line: 'walk in like the chorus just hit' },
  { name: 'Lonely', c1: '#6E7FA3', c2: '#23263B', energy: 1.5, line: 'company for the quiet hours' },
  { name: 'Main Character', c1: '#E9C46A', c2: '#A44A6B', energy: 3.5, line: 'the camera is on you. act accordingly.' },
  { name: 'Restless', c1: '#D97B5F', c2: '#3E3A66', energy: 3.5, line: 'for a mind that will not sit down' },
  { name: 'Hopeful', c1: '#F6D186', c2: '#7FA7C9', energy: 3, line: 'light getting in around the edges' },
  { name: 'Late Night', c1: '#7C6BD6', c2: '#151532', energy: 2.5, line: 'the city is asleep. you are not.' },
  { name: 'Unbothered', c1: '#9AD1C3', c2: '#5B6FB0', energy: 3.5, line: 'not my circus, not my playlist' },
  { name: 'Freedom', c1: '#6EC1E4', c2: '#D98A5B', energy: 4, line: 'windows down, destination optional' },
  { name: 'Lost', c1: '#8A8FA8', c2: '#2D2A3D', energy: 2, line: 'for the in-between, before the map appears' },
  { name: 'Inspired', c1: '#B7E07A', c2: '#3E8E9E', energy: 3.5, line: 'the feeling right before you make something' },
  { name: 'Peaceful Chaos', c1: '#E8A0BF', c2: '#4A6FA5', energy: 3.5, line: 'everything is happening and somehow it is fine' },
];

export const MOOD_NAMES = MOODS.map((m) => m.name);

export const LANGUAGES = ['English', 'Tamil', 'Hindi', 'Malayalam', 'Telugu', 'Punjabi', 'Korean', 'Japanese', 'Spanish', 'French', 'Instrumental'];

export const GENRES = ['indie', 'pop', 'rock', 'R&B', 'hip-hop', 'electronic', 'classical', 'jazz', 'alternative', 'film', 'folk'];

export const DISCOVERY_GOALS = [
  'Hidden gems nobody talks about',
  'New and emerging artists',
  'More music in my languages',
  'Music from cultures I do not know yet',
  'Old classics I missed',
  'Whatever fits my mood right now',
];

export interface BackgroundDef {
  key: string;
  name: string;
  base: string;
  // radial glows: x%, y%, colour, radius% of the larger side
  glows: [number, number, string, number][];
}

/** Visual backdrops for Mood Drops. Rendered identically in CSS and on <canvas> for exports. */
export const BACKGROUNDS: BackgroundDef[] = [
  { key: 'dusk', name: 'Dusk', base: '#141022', glows: [[18, 12, '#7C5CD6', 62], [88, 86, '#D9799F', 58], [70, 20, '#2B2A6B', 50]] },
  { key: 'ember', name: 'Ember', base: '#170D0E', glows: [[80, 10, '#E0703F', 55], [10, 90, '#8E2F4F', 60], [50, 50, '#3B1522', 45]] },
  { key: 'tide', name: 'Tide', base: '#0A1418', glows: [[12, 18, '#2E7F8F', 60], [92, 78, '#4B5FB3', 55], [60, 40, '#123540', 50]] },
  { key: 'noir', name: 'Noir', base: '#0B0B0F', glows: [[50, -10, '#4A4760', 60], [100, 100, '#22212E', 60]] },
  { key: 'bloom', name: 'Bloom', base: '#1A1020', glows: [[20, 80, '#F0A6C8', 52], [85, 15, '#A78BFA', 55], [55, 55, '#4A2A5A', 45]] },
  { key: 'haze', name: 'Haze', base: '#12131C', glows: [[30, 20, '#C4B5FD', 48], [80, 70, '#6D83C9', 55], [10, 95, '#394070', 50]] },
  { key: 'gold', name: 'Golden Hour', base: '#17120D', glows: [[85, 18, '#E9B15C', 55], [12, 82, '#A4524A', 58], [45, 45, '#3D2A1C', 45]] },
  { key: 'moss', name: 'After Rain', base: '#0C1412', glows: [[15, 15, '#5E9C84', 55], [90, 90, '#3A5C8C', 55], [60, 30, '#1C332C', 50]] },
];

export const BACKGROUND_KEYS = BACKGROUNDS.map((b) => b.key);

export const CONVERSATION_STYLES = [
  { key: 'quick', name: 'Quick discovery', blurb: 'One line in, songs out.' },
  { key: 'casual', name: 'Casual conversation', blurb: 'A little back and forth, like a friend would.' },
  { key: 'deep', name: 'Deep discovery', blurb: 'Take your time. We will get specific.' },
  { key: 'situational', name: 'For a moment', blurb: 'Driving, studying, cooking, not sleeping.' },
] as const;

export type ConversationStyle = (typeof CONVERSATION_STYLES)[number]['key'];
