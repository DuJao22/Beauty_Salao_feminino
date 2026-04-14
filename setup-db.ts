import { initDb } from './src/db/database';

async function run() {
  console.log('Iniciando geração do banco de dados SQLite...');
  try {
    await initDb();
    console.log('Banco de dados inicializado com sucesso no SQLite Cloud!');
  } catch (error) {
    console.error('Erro ao gerar o banco de dados:', error);
    process.exit(1);
  }
}

run();
