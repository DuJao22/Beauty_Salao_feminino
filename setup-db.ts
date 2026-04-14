import { initDb } from './src/db/database';

async function run() {
  console.log('Iniciando geração do banco de dados SQLite...');
  try {
    await initDb();
    console.log('Banco de dados gerado com sucesso! O arquivo "database.sqlite" foi criado na raiz do projeto.');
  } catch (error) {
    console.error('Erro ao gerar o banco de dados:', error);
    process.exit(1);
  }
}

run();
