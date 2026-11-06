/**
 * Script de migración de archivos multimedia desde el sistema anterior (/home/iqxalgre/public_html/uploads)
 * hacia la carpeta local del nuevo Sistema Roma V4 (./uploads).
 *
 * Uso en cPanel terminal:
 *   node scripts/migrate-legacy-uploads.cjs
 * O con ruta personalizada:
 *   node scripts/migrate-legacy-uploads.cjs /ruta/personalizada/uploads
 */

const fs = require('fs');
const path = require('path');

const defaultSource = '/home/iqxalgre/public_html/uploads';
const sourceDir = process.argv[2] || process.env.LEGACY_UPLOADS_DIR || process.env.UPLOADS_DIR || defaultSource;
const destDir = path.resolve(process.cwd(), 'uploads');

console.log('=================================================================');
console.log('🔄 MIGRACIÓN DE ARCHIVOS MULTIMEDIA - SISTEMA ROMA');
console.log('=================================================================');
console.log(`📂 Origen (Sistema Anterior): ${sourceDir}`);
console.log(`📁 Destino (Sistema Actual):   ${destDir}`);
console.log('-----------------------------------------------------------------');

if (!fs.existsSync(sourceDir)) {
  console.error(`❌ Error: El directorio de origen no existe: ${sourceDir}`);
  console.log('Verifica la ruta en cPanel o pásala como argumento.');
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

let copiedFiles = 0;
let skippedFiles = 0;
let totalBytes = 0;
let errorFiles = 0;

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      try {
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          const stat = fs.statSync(destPath);
          totalBytes += stat.size;
          copiedFiles++;
          if (copiedFiles % 50 === 0) {
            console.log(`  ✓ Migrados ${copiedFiles} archivos...`);
          }
        } else {
          skippedFiles++;
        }
      } catch (err) {
        console.error(`  ⚠️ Error al copiar ${entry.name}:`, err.message);
        errorFiles++;
      }
    }
  }
}

console.log('⏳ Iniciando copia de archivos...');
const startTime = Date.now();
copyRecursive(sourceDir, destDir);
const duration = ((Date.now() - startTime) / 1000).toFixed(2);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

console.log('-----------------------------------------------------------------');
console.log('🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!');
console.log(`⏱️  Tiempo transcurrido: ${duration} s`);
console.log(`📦 Archivos nuevos copiados: ${copiedFiles} (${totalMB} MB)`);
console.log(`⏩ Archivos ya existentes (omitidos): ${skippedFiles}`);
if (errorFiles > 0) {
  console.log(`⚠️ Archivos con error: ${errorFiles}`);
}
console.log('=================================================================\n');
