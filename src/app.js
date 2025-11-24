import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // ✅ make sure `app` is defined

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load routes asynchronously
const loadRoutes = async () => {
  const routesPath = path.join(__dirname, 'routes');
  const files = fs.readdirSync(routesPath);

  for (const file of files) {
    if (file.endsWith('Route.js') && file !== 'basicAuthRoute.js' && file !== 'invitationRoute.js') {
      const route = await import(`./routes/${file}`);
      app.use('/api/v1', route.default);
    }
  }

  // Load payment routes
  const paymentRoute = await import('./routes/paymentRoute.js');
  app.use('/api/v1', paymentRoute.default);
};

export { app, loadRoutes };
