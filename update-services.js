import { getDb } from './src/db/database.js';

async function updateServices() {
  const db = getDb();
  await db.sql('UPDATE services SET duration = 40');
  console.log('Services updated to 40 minutes');
}

updateServices().catch(console.error);
