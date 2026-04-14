import { getDb } from './src/db/database';
async function test() {
  const db = await getDb();
  try {
    const res = await db.all(`SELECT * FROM settings`);
    console.log("Settings:", res);
  } catch (e) {
    console.error(e);
  }
}
test();
