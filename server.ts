import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config/index.js';
import { apiRouter } from './server/routes/index.js';
import { errorHandler } from './server/middlewares/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Body Parser Middleware
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Centralized Error Handling for API routes
app.use('/api', errorHandler);

// --- Vite Middleware & Static Frontend Serving ---
async function startServer() {
  if (!config.isProd) {
    // Development mode: Vite middleware handles React SPA with HMR
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(config.PORT), '0.0.0.0', () => {
    console.log(`[StJude Hospital REST API] Running on http://0.0.0.0:${config.PORT}`);
    console.log(`[Architecture] Modular architecture loaded: Controllers, Models, Utils, DB Repository`);
    console.log(`[Token Auth] JWT Bearer Token Authentication Engine active`);
  });
}

startServer();
