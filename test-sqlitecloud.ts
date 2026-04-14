import 'dotenv/config';
import { Database } from '@sqlitecloud/drivers';

async function test() {
  const connectionString = process.env.SQLITE_CLOUD_CONNECTION_STRING;
  console.log('Testing connection to:', connectionString?.split('?')[0] + '...');
  
  if (!connectionString) {
    throw new Error('SQLITE_CLOUD_CONNECTION_STRING not found');
  }

  const db = new Database(connectionString);
  
  console.log('db.get type:', typeof (db as any).get);
  console.log('db.all type:', typeof (db as any).all);
  console.log('db.run type:', typeof (db as any).run);
  console.log('db.sql type:', typeof (db as any).sql);
  
  try {
    await db.sql('CREATE TABLE IF NOT EXISTS test_insert (id INTEGER PRIMARY KEY, val TEXT)');
    const res = await db.sql('INSERT INTO test_insert (val) VALUES (?)', 'hello');
    console.log('Insert result:', res);
    console.log('lastID:', (res as any).lastID);
  } catch (err) {
    console.error('Insert error:', err);
  }
  
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
