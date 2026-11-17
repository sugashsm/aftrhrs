/**
 * End-to-end API journey. Boots the real Express app against a throwaway in-memory database
 * and walks the same path a new listener would. Run with: npm test
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AI_PROVIDER = '';

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app';
import { openDb } from '../src/db';
import { seedIfEmpty } from '../src/seed';
import { detectMood } from '../src/ai/engine';

let server: Server;
let base = '';

/** Minimal cookie-jar client. */
function client() {
  let cookie = '';
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const data: any = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };
}

before(async () => {
  openDb(':memory:');
  seedIfEmpty();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as any).port}/api`;
});
after(() => server.close());

const me = client();
let myDropId = 0;
let otherUser: any;

test('seed data meets the brief', async () => {
  const anon = client();
  const home = await anon('GET', '/public/home');
  assert.equal(home.status, 200);
  assert.ok(home.data.counts.songs >= 100, 'at least 100 songs');
  assert.equal(home.data.counts.rooms, 10);
  assert.ok(home.data.featured.length >= 5);
  const captions = (await anon('GET', '/drops?feed=latest&page=0')).data.items.map((d: any) => d.caption);
  assert.ok(captions.length > 0);
  const lists = await anon('GET', '/playlists');
  assert.equal(lists.data.curated.length, 15);
  const facets = await anon('GET', '/songs/facets');
  for (const l of ['Tamil', 'Hindi', 'English', 'Malayalam', 'Telugu']) assert.ok(facets.data.languages.includes(l), `${l} present`);
});

test('1. register, session, logout, login', async () => {
  assert.equal((await me('GET', '/notifications')).status, 401, 'protected route rejects anonymous');
  const weak = await me('POST', '/auth/register', { email: 'a@b.co', username: 'listener', displayName: 'L', password: 'short' });
  assert.equal(weak.status, 400);
  const r = await me('POST', '/auth/register', { email: 'new@listener.test', username: 'new.listener', displayName: 'New Listener', password: 'midnight42' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.onboarded, false);
  assert.equal((await me('GET', '/auth/me')).data.user.username, 'new.listener');
  const dup = await client()('POST', '/auth/register', { email: 'new@listener.test', username: 'someone.else', displayName: 'X', password: 'midnight42' });
  assert.equal(dup.status, 409);
  await me('POST', '/auth/logout');
  assert.equal((await me('GET', '/auth/me')).data.user, null);
  assert.equal((await me('POST', '/auth/login', { identifier: 'new.listener', password: 'wrong-pass1' })).status, 401);
  assert.equal((await me('POST', '/auth/login', { identifier: 'new@listener.test', password: 'midnight42' })).status, 200);
});

test('2. onboarding stores preferences', async () => {
  const bad = await me('PUT', '/me/preferences', { languages: [], genres: [], artists: [], moods: [], discovery: [] });
  assert.equal(bad.status, 400);
  const r = await me('PUT', '/me/preferences', { languages: ['Tamil', 'English'], genres: ['indie', 'film'], artists: ['A.R. Rahman', 'Frank Ocean'], moods: ['Nostalgic', 'Late Night'], discovery: ['Hidden gems nobody talks about'] });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.onboarded, true);
  assert.deepEqual(r.data.user.preferences.languages, ['Tamil', 'English']);
});

test('3. feeds: for you, following, trending, latest, mood filter, pagination', async () => {
  for (const feed of ['foryou', 'trending', 'latest', 'following']) {
    const r = await me('GET', `/drops?feed=${feed}&page=0`);
    assert.equal(r.status, 200, feed);
    if (feed !== 'following') assert.ok(r.data.items.length > 0, `${feed} has items`);
  }
  const p0 = await me('GET', '/drops?feed=latest&page=0');
  const p1 = await me('GET', `/drops?feed=latest&page=${p0.data.nextPage}`);
  assert.ok(p1.data.items.length > 0);
  assert.notEqual(p0.data.items[0].id, p1.data.items[0].id);
  const mood = await me('GET', '/drops?feed=latest&mood=Nostalgic');
  assert.ok(mood.data.items.length > 0 && mood.data.items.every((d: any) => d.mood.name === 'Nostalgic'));
  const personal = await me('GET', '/discover');
  assert.ok(personal.data.forYou.length > 0 && personal.data.people.length > 0 && personal.data.hiddenGems.length > 0);
});

test('4. create a Mood Drop (with validation and a custom mood)', async () => {
  const song = (await me('GET', '/songs?q=munbe')).data.songs[0];
  assert.ok(song);
  assert.equal((await me('POST', '/drops', { songId: song.id, mood: 'Nostalgic', caption: '', background: 'dusk' })).status, 400);
  assert.equal((await me('POST', '/drops', { songId: song.id, mood: 'Nostalgic', caption: 'x', background: 'nope' })).status, 400);
  const custom = await me('POST', '/moods', { name: 'Monsoon Brain' });
  assert.equal(custom.status, 201);
  const r = await me('POST', '/drops', { songId: song.id, mood: 'Monsoon Brain', caption: 'It rained and I let it.', background: 'moss' });
  assert.equal(r.status, 201);
  assert.equal(r.data.drop.mood.name, 'Monsoon Brain');
  myDropId = r.data.drop.id;
  assert.equal((await me('POST', '/drops', { songId: song.id, mood: 'Peaceful', caption: 'room post', background: 'moss', roomSlug: '2am-club' })).status, 403, 'must join a room before posting in it');
});

test('5. like, comment and save', async () => {
  const target = (await me('GET', '/drops?feed=latest&page=1')).data.items.find((d: any) => !d.mine);
  const before = target.likeCount;
  assert.equal((await me('POST', `/drops/${target.id}/like`)).data.likeCount, before + 1);
  assert.equal((await me('POST', `/drops/${target.id}/like`)).data.likeCount, before + 1, 'liking twice counts once');
  const c = await me('POST', `/drops/${target.id}/comments`, { body: 'This one stays with me.' });
  assert.equal(c.status, 201);
  assert.equal((await me('POST', `/drops/${target.id}/save`)).data.saved, true);
  const again = (await me('GET', `/drops/${target.id}`)).data.drop;
  assert.ok(again.liked && again.saved && again.commentCount >= 1);
  assert.ok((await me('GET', '/users/new.listener/saved-posts')).data.items.some((d: any) => d.id === target.id));
  assert.equal((await me('DELETE', `/comments/${c.data.comment.id}`)).status, 200);
  assert.equal((await me('DELETE', `/drops/${target.id}`)).status, 403, "cannot delete someone else's drop");
});

test('6. follow, unfollow, search, block, report', async () => {
  otherUser = (await me('GET', '/users/search?q=mira')).data.users[0];
  assert.equal(otherUser.username, 'mira.after');
  assert.equal((await me('POST', `/users/${otherUser.id}/follow`)).data.following, true);
  assert.equal((await me('GET', '/users/mira.after')).data.profile.following, true);
  assert.ok((await me('GET', '/drops?feed=following')).data.items.some((d: any) => d.author.username === 'mira.after'));
  assert.equal((await me('DELETE', `/users/${otherUser.id}/follow`)).data.following, false);

  const zaid = (await me('GET', '/users/search?q=zaid')).data.users[0];
  await me('POST', `/users/${zaid.id}/block`);
  assert.equal((await me('GET', '/me/blocked')).data.users.length, 1);
  const all = (await me('GET', '/drops?feed=trending&page=0')).data.items.concat((await me('GET', '/drops?feed=trending&page=1')).data.items);
  assert.ok(all.every((d: any) => d.author.username !== 'zaid.afterdark'), 'blocked users disappear from feeds');
  await me('DELETE', `/users/${zaid.id}/block`);

  const victim = (await me('GET', '/drops?feed=latest&page=2')).data.items.find((d: any) => !d.mine);
  assert.equal((await me('POST', `/drops/${victim.id}/report`, { reason: 'spam' })).status, 201);
  assert.equal((await me('GET', `/drops/${victim.id}`)).status, 404, 'reported drops are hidden from the reporter');
});

let convoId = 0;
let lastPicks: any[] = [];
test('7. Mood AI holds a contextual conversation', async () => {
  const status = await me('GET', '/ai/status');
  assert.equal(status.data.engine, 'rule-based');
  assert.equal(status.data.external, false);
  const c = await me('POST', '/ai/conversations', { style: 'casual', hour: 23 });
  assert.equal(c.status, 201);
  convoId = c.data.conversation.id;
  assert.match(c.data.conversation.messages[0].content, /soundtrack together/);
  const say = async (text: string) => (await me('POST', `/ai/conversations/${convoId}/messages`, { text, hour: 23 })).data.messages[1];

  const a = await say('Play something.');
  assert.match(a.content, /night/i);
  assert.equal(a.recommendations, undefined);
  const b = await say('Anything.');
  assert.match(b.content, /nostalgic, peaceful, restless,? or just existing/i);
  const c2 = await say('Just existing.');
  assert.ok(c2.recommendations?.length >= 3, 'vague answer still lands on music');
  assert.equal(c2.detected.mood, 'Lost');
  const d = await say('Something nostalgic.');
  assert.equal(d.detected.mood, 'Nostalgic');
  assert.ok(d.quickReplies.includes('Old memories'));
  const e = await say('Old versions of me');
  assert.ok(e.recommendations.length >= 3);
  assert.ok(e.recommendations.every((p: any) => p.reason.length > 20), 'every pick is explained');
  lastPicks = e.recommendations;

  const regen = (await me('POST', `/ai/conversations/${convoId}/messages`, { action: 'regenerate' })).data.messages[1];
  const first = new Set(lastPicks.map((p: any) => p.song.id));
  assert.ok(regen.recommendations.every((p: any) => !first.has(p.song.id)), 'regeneration avoids repeats');
  const tamil = await say('same but in tamil');
  assert.ok(tamil.recommendations.filter((p: any) => p.song.language === 'Tamil').length >= 2);
});

test('7b. mood understanding', () => {
  const cases: [string, string][] = [
    ['I just went through a breakup', 'Heartbroken'], ["can't sleep, it's 3am", 'Late Night'], ['feeling really anxious and overthinking', 'Restless'],
    ['i miss my school days', 'Nostalgic'], ['today was the best day, so happy', 'Euphoric'], ['i feel lost and stuck', 'Lost'], ['peaceful chaos', 'Peaceful Chaos'],
    ["i'd love something calm", 'Peaceful'], ['i am not sad, i am hopeful', 'Hopeful'],
  ];
  for (const [text, mood] of cases) assert.equal(detectMood(text)?.mood, mood, text);
});

test('8. generate and save a playlist', async () => {
  const r = (await me('POST', `/ai/conversations/${convoId}/messages`, { action: 'playlist' })).data.messages[1];
  assert.ok(r.playlist.songs.length >= 8);
  const saved = await me('POST', '/playlists', { title: r.playlist.title, description: r.playlist.description, mood: r.playlist.mood, source: 'ai', songs: r.playlist.songs.map((p: any) => ({ id: p.song.id, reason: p.reason })) });
  assert.equal(saved.status, 201);
  const mine = await me('GET', '/playlists');
  assert.equal(mine.data.mine.length, 1);
  const full = await me('GET', `/playlists/${saved.data.playlist.id}`);
  assert.equal(full.data.playlist.songs.length, r.playlist.songs.length);
});

test('9. save a recommendation', async () => {
  const song = lastPicks[0].song;
  assert.equal((await me('POST', `/songs/${song.id}/save`)).data.saved, true);
  assert.ok((await me('GET', '/users/new.listener/saved-songs')).data.songs.some((s: any) => s.id === song.id));
  const convo = await me('GET', `/ai/conversations/${convoId}`);
  const found = convo.data.conversation.messages.flatMap((m: any) => m.recommendations || []).find((p: any) => p.song.id === song.id);
  assert.equal(found.song.saved, true, 'conversation history reflects the save');
});

test('10. publish an AI recommendation as a Mood Drop', async () => {
  const r = await me('POST', '/drops', { songId: lastPicks[1].song.id, mood: 'Nostalgic', caption: 'Some songs are just rooms I used to live in.', background: 'gold', source: 'ai' });
  assert.equal(r.status, 201);
  assert.equal(r.data.drop.source, 'ai');
});

test('11. join a Sound Room, post, discuss, leave', async () => {
  const before = (await me('GET', '/rooms/2am-club')).data.room;
  assert.equal(before.joined, false);
  assert.equal((await me('POST', '/rooms/2am-club/discussions', { body: 'hi' })).status, 403);
  const joined = (await me('POST', '/rooms/2am-club/join')).data.room;
  assert.equal(joined.memberCount, before.memberCount + 1, 'member count is real membership');
  const song = (await me('GET', '/songs?mood=Late%20Night')).data.songs[0];
  assert.equal((await me('POST', '/drops', { songId: song.id, mood: 'Late Night', caption: 'Still up.', background: 'noir', roomSlug: '2am-club' })).status, 201);
  assert.equal((await me('POST', '/rooms/2am-club/discussions', { body: 'What is everyone avoiding tonight?' })).status, 201);
  const room = (await me('GET', '/rooms/2am-club')).data;
  assert.ok(room.drops.some((d: any) => d.mine) && room.discussions.some((d: any) => d.mine) && room.members.some((m: any) => m.isMe));
  assert.ok(room.songs.length >= 5);
});

test('12. data persists across sessions', async () => {
  await me('POST', '/auth/logout');
  await me('POST', '/auth/login', { identifier: 'new.listener', password: 'midnight42' });
  const profile = (await me('GET', '/users/new.listener')).data.profile;
  assert.equal(profile.dropCount, 3);
  assert.ok(profile.rooms.some((r: any) => r.slug === '2am-club'));
  assert.equal(profile.soundOfMe.ready, true);
  assert.ok((await me('GET', `/drops/${myDropId}`)).data.drop.mine);
  assert.ok((await me('GET', '/ai/conversations')).data.conversations.length >= 1);
});

test('notifications, settings and privacy', async () => {
  const other = client();
  await other('POST', '/auth/register', { email: 'second@listener.test', username: 'second', displayName: 'Second', password: 'daylight77' });
  const mine = (await me('GET', '/auth/me')).data.user;
  await other('POST', `/users/${mine.id}/follow`);
  await other('POST', `/drops/${myDropId}/like`);
  await other('POST', `/drops/${myDropId}/comments`, { body: 'This is lovely.' });
  const n = (await me('GET', '/notifications')).data.notifications;
  for (const type of ['follow', 'like', 'comment', 'welcome']) assert.ok(n.some((x: any) => x.type === type), type);
  assert.ok((await me('GET', '/auth/me')).data.user.unread >= 3);
  await me('POST', '/notifications/read');
  assert.equal((await me('GET', '/auth/me')).data.user.unread, 0);

  // Private accounts hide drops from non-followers.
  const stranger = client();
  await stranger('POST', '/auth/demo');
  await me('PUT', '/me/settings', { isPrivate: true, notifPrefs: { likes: false, comments: true, follows: true } });
  assert.equal((await stranger('GET', `/drops/${myDropId}`)).status, 404);
  assert.equal((await stranger('GET', '/users/new.listener')).data.profile.canSee, false);
  assert.equal((await other('GET', `/drops/${myDropId}`)).status, 200, 'followers can still see');
  await me('PUT', '/me/settings', { isPrivate: false });

  const edit = await me('PUT', '/me', { displayName: 'Renamed', bio: 'New bio', currentMood: 'Hopeful' });
  assert.equal(edit.data.user.displayName, 'Renamed');
  assert.equal(edit.data.user.currentMood, 'Hopeful');
  assert.equal((await other('DELETE', `/drops/${myDropId}`)).status, 403);
  assert.equal((await stranger('GET', '/auth/me')).data.user.isGuest, true);
});

test('14. errors and empty states', async () => {
  assert.equal((await me('GET', '/drops/999999')).status, 404);
  assert.equal((await me('GET', '/users/nobody-here')).status, 404);
  assert.equal((await me('GET', '/rooms/nope')).status, 404);
  assert.equal((await me('GET', '/nope')).status, 404);
  assert.deepEqual((await me('GET', '/songs?q=zzzzzzzz')).data.songs, []);
  assert.deepEqual((await me('GET', '/drops?feed=latest&mood=DoesNotExist')).data.items, []);
  assert.equal((await me('POST', '/ai/conversations/999/messages', { text: 'hi' })).status, 404);
});

test('delete account removes everything', async () => {
  assert.equal((await me('DELETE', '/me', { confirm: 'new.listener', password: 'nope' })).status, 401);
  assert.equal((await me('DELETE', '/me', { confirm: 'new.listener', password: 'midnight42' })).status, 200);
  assert.equal((await me('GET', '/auth/me')).data.user, null);
  assert.equal((await client()('GET', `/drops/${myDropId}`)).status, 404);
});
