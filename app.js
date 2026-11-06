/**
 * Punto de entrada (Application Startup File) para cPanel de BanaHosting (Phusion Passenger)
 * En cPanel -> Setup Node.js App:
 * - Application root: /tu_carpeta_sistema
 * - Application startup file: app.js
 */

process.on('uncaughtException', (err) => {
  const fs = require('fs');
  const path = require('path');
  const msg = `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.stack || err}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'stderr.log'), msg);
    fs.appendFileSync(path.join(__dirname, 'error_startup.log'), msg);
  } catch {}
  console.error(msg);
});

process.on('unhandledRejection', (reason) => {
  const fs = require('fs');
  const path = require('path');
  const msg = `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'stderr.log'), msg);
  } catch {}
  console.error(msg);
});

try {
  require('./dist/server/index.js');
} catch (err) {
  const fs = require('fs');
  const path = require('path');
  const logMsg = `[${new Date().toISOString()}] FATAL STARTUP ERROR:\n${err.stack || err}\n\n`;
  try {
    fs.appendFileSync(path.join(__dirname, 'error_startup.log'), logMsg);
    fs.appendFileSync(path.join(__dirname, 'stderr.log'), logMsg);
  } catch {}
  console.error(logMsg);

  // Servidor de emergencia para evitar 503 en Phusion Passenger
  const http = require('http');
  const port = process.env.PORT || 3001;
  const server = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Error de Inicio - Sistema ROMA</title></head>
      <body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;">
        <div style="max-width:700px;margin:auto;background:#1e293b;padding:30px;border-radius:16px;border:1px solid #334155;">
          <h2 style="color:#f43f5e;margin-top:0;">⚠️ Error al iniciar el servidor en cPanel</h2>
          <p style="color:#94a3b8;">Falta instalar dependencias de Node.js en cPanel para completar la actualización:</p>
          <pre style="background:#0f172a;padding:15px;border-radius:8px;color:#cbd5e1;overflow:auto;font-size:13px;">${err.stack || err}</pre>
          <div style="margin-top:20px;padding:15px;background:#0284c715;border:1px solid #0284c740;border-radius:8px;">
            <strong style="color:#38bdf8;">Cómo solucionarlo:</strong>
            <ol style="margin:10px 0 0 20px;padding:0;color:#e2e8f0;line-height:1.6;">
              <li>En cPanel, abre <strong>Setup Node.js App</strong></li>
              <li>Haz clic en el botón <strong>"Run NPM Install"</strong></li>
              <li>Haz clic en <strong>"Restart"</strong></li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
  });
  server.listen(port, () => {
    console.log(`[Emergencia] Servidor escuchando en ${port}`);
  });
}
