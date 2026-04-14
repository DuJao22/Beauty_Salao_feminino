import { Database } from '@sqlitecloud/drivers';

async function test() {
  const db = new Database('sqlitecloud://ct9xsnnpvz.g1.sqlite.cloud:8860/AGENDAI.db?apikey=c9lGTn4sb98t3kl3w2gU8cMXQiKDavSd7QF3vTwHV9Q');
  
  await db.exec('CREATE TABLE IF NOT EXISTS test3 (id INTEGER PRIMARY KEY, a TEXT, b TEXT)');
  
  const res = await db.sql('INSERT INTO test3 (a, b) VALUES (?, ?), (?, ?)', 'a1', 'b1', 'a2', 'b2');
  console.log('run result:', res);
  
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
