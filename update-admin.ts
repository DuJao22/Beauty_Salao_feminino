import { Database } from '@sqlitecloud/drivers';

async function updateAdmin() {
  const connectionString = process.env.DATABASE_URL || 'sqlitecloud://ct9xsnnpvz.g1.sqlite.cloud:8860/AGENDAI.db?apikey=c9lGTn4sb98t3kl3w2gU8cMXQiKDavSd7QF3vTwHV9Q';
  const db = new Database(connectionString);
  
  console.log('Updating admin credentials...');
  
  // Update all tenants to have this admin username and password
  const res = await db.sql('UPDATE tenants SET admin_username = ?, admin_password = ?', 'Dujao', '30031936');
  
  console.log('Update result:', res);
  
  const tenants = await db.sql('SELECT id, slug, name, admin_username, admin_password FROM tenants');
  console.log('Tenants:', tenants);
  
  process.exit(0);
}

updateAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
