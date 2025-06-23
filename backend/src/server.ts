import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

// Conditionally load .env file in development
if (process.env.NODE_ENV !== 'production') {
	dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

// Import API routes
import apiRoutes from './routes';
import { uploadFile } from './file-storage';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- File Upload Setup (Multer) ---
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
	console.log(`Created uploads directory at: ${uploadsDir}`);
}

// We now use memoryStorage() because our new file-storage service will handle
// the actual saving of the file (either locally or to the cloud).
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 } // Optional: Limit file size (e.g., 10MB)
});

// Serve static files from the 'uploads' directory, making them accessible via /uploads URL path
app.use('/uploads', express.static(uploadsDir));

// --- Basic Routes ---
app.get('/', (req: Request, res: Response) => {
	res.send('GEFIFI Backend Server is running!');
});

// --- API Routes ---
// Mount the imported API routes from routes.ts under the /api prefix
app.use('/api', apiRoutes);

// --- File Upload Endpoint ---
// This endpoint now uses our file-storage service to handle the upload.
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'No file uploaded. Please select a file to upload.' });
		}

		// The file-storage service handles whether to save locally or to GCS
		const { filePath, fileName } = await uploadFile(req.file);

		res.status(200).json({
			message: 'File uploaded successfully!',
			filePath: filePath, // This is now a full URL in production, or a relative path in dev
			fileName: fileName,
			originalName: req.file.originalname,
			mimeType: req.file.mimetype,
			size: req.file.size
		});
	} catch (error: unknown) {
		console.error('File upload endpoint error:', error);
		const message =
			error instanceof Error ? error.message : 'An unknown error occurred during file upload.';
		res.status(500).json({ message });
	}
});

// --- Error Handling Middleware (Basic) ---
// This should be one of the last middleware functions added.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
	console.error('Global error handler:', err.stack);
	// If the error is from Multer (e.g., file too large)
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ message: `File upload error: ${err.message}` });
	}
	// For other errors
	res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});

// --- Start Server ---
// Listen on all network interfaces in containers.
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
app.listen(Number(PORT), HOST, () => {
	console.log(`Server is running on http://${HOST}:${PORT}`);
	console.log(`Current environment: ${process.env.NODE_ENV || 'development'}`);
	if (process.env.NODE_ENV !== 'production') {
		console.log(`Attempting to load .env file from: ${path.resolve(__dirname, '..', '.env')}`);
	}
});

export default app; // Export app for potential serverless deployment or testing
