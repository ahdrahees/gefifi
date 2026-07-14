import { Router } from 'express';

// Import all route modules
import authRoutes from './auth';
import userRoutes from './users';
import workRequestRoutes from './work-requests';
import materialRequestRoutes from './material-requests';
import chatRoutes from './chat';
import contractRoutes from './contracts';
import contractSigningRoutes from './contracts-signing';
import contractManagementRoutes from './contracts-management';
import userInteractionRoutes from './user-interactions';
import attachmentRoutes from './attachments';
import quoteRoutes from './quotes';

const router = Router();

// Mount all route modules
router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/', workRequestRoutes);
router.use('/', materialRequestRoutes);
router.use('/', chatRoutes);
router.use('/', contractRoutes);
router.use('/', contractSigningRoutes);
router.use('/', contractManagementRoutes);
router.use('/', userInteractionRoutes);
router.use('/', attachmentRoutes);
router.use('/', quoteRoutes);

console.log('API routes module (routes/index.ts) initialized with all endpoints.');
export default router;
