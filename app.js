/**
 * Punto de entrada (Application Startup File) para cPanel de BanaHosting (Phusion Passenger)
 * En cPanel -> Setup Node.js App:
 * - Application root: /tu_carpeta_sistema
 * - Application startup file: app.js
 */
require('./dist/server/index.js');
