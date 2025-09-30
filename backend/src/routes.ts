import { Router } from 'express';
import routes from './routes/index';

const router = Router();

// Mount all routes
router.use('/', routes);

console.log('API routes module (routes.ts) initialized with core endpoints.');
export default router;
export { chatFileUpload } from './routes/shared/middleware';
