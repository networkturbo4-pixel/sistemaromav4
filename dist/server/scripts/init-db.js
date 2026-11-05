"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function run() {
    console.log('Inicializando base de datos y semilla Multitenant...');
    await db_1.db.initialize();
    console.log('Estado del motor:', db_1.db.getEngineInfo());
    process.exit(0);
}
run().catch((err) => {
    console.error('Error inicializando DB:', err);
    process.exit(1);
});
