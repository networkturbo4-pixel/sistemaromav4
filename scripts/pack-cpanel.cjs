const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('🚀 [1/3] Compilando frontend y backend para producción...');
execSync('npm run build', { stdio: 'inherit' });

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'deploy-cpanel.zip');
const tempStaging = path.join(os.tmpdir(), `roma_cpanel_${Date.now()}`);

if (fs.existsSync(zipFile)) {
  try {
    fs.unlinkSync(zipFile);
  } catch (e) {
    // Si no se puede borrar, intentar con un nombre único o ignorar
  }
}

console.log('📋 [2/3] Preparando archivos limpios de producción...');
fs.mkdirSync(tempStaging, { recursive: true });

// Copiar elementos base
const baseItems = ['dist', 'data', 'database', 'public', 'app.js', 'package.json', 'package-lock.json', '.env.example'];
for (const item of baseItems) {
  const src = path.join(rootDir, item);
  const dest = path.join(tempStaging, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`   ✓ Copiado: ${item}`);
  }
}

// Copiar uploads excluyendo archivos pesados (como 'references' que pesan varios GBs)
const uploadsSrc = path.join(rootDir, 'uploads');
const uploadsDest = path.join(tempStaging, 'uploads');
if (fs.existsSync(uploadsSrc)) {
  fs.mkdirSync(uploadsDest, { recursive: true });
  const entries = fs.readdirSync(uploadsSrc, { withFileTypes: true });
  for (const entry of entries) {
    // Omitir 'references' pesadas (se manejan vía Drive / Cloud)
    if (entry.name === 'references') {
      const emptyRefDir = path.join(uploadsDest, 'references');
      fs.mkdirSync(emptyRefDir, { recursive: true });
      fs.writeFileSync(path.join(emptyRefDir, '.gitkeep'), '');
      continue;
    }
    const s = path.join(uploadsSrc, entry.name);
    const d = path.join(uploadsDest, entry.name);
    fs.cpSync(s, d, { recursive: true });
  }
  console.log('   ✓ Copiado: uploads (optimizado sin multimedia pesada)');
}

console.log('🗜️  [3/3] Comprimiendo paquete deploy-cpanel.zip...');
const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${tempStaging}\\*' -DestinationPath '${zipFile}' -Force"`;
execSync(psCommand, { stdio: 'inherit' });

// Limpiar staging temporal en os.tmpdir
try {
  fs.rmSync(tempStaging, { recursive: true, force: true });
} catch (e) {}

const stats = fs.statSync(zipFile);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n🎉 ¡Listo! Archivo generado con éxito: deploy-cpanel.zip (${sizeMB} MB)`);
console.log(`📍 Ubicación: ${zipFile}\n`);
