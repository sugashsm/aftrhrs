import 'dotenv/config';
import { createApp } from './app';
import { openDb } from './db';
import { pruneGuests, seedIfEmpty } from './seed';
import { startBackgroundEnrichment } from './itunes';
import { getProvider } from './ai/provider';

openDb();
seedIfEmpty();
pruneGuests();

// In development the API runs beside Vite on API_PORT (hosting tools often inject PORT for the web server).
// In production one process serves both the API and the built client on PORT.
const port = Number(process.env.API_PORT) || (process.env.NODE_ENV === 'production' && Number(process.env.PORT)) || 4000;
createApp().listen(port, () => {
  console.log(`[aftrhrs] api listening on http://localhost:${port}`);
  console.log(`[aftrhrs] mood ai engine: ${getProvider().label}`);
  startBackgroundEnrichment();
});
