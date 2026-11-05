import { db } from '../db';

async function run() {
  console.log('Inicializando base de datos y semilla Multitenant...');
  await db.initialize();
  console.log('Estado del motor:', db.getEngineInfo());
  process.exit(0);
}

run().catch((err) => {
  console.error('Error inicializando DB:', err);
  process.exit(1);
});
