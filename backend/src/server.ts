import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

// Load environment variables from .env file in the backend directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Import API routes
import apiRoutes from './routes'; 

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

// Set up storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Files will be saved in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Use a timestamp and random number for unique filenames, preserving the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
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

// --- File Upload Endpoint (still here for now, can be moved to routes.ts later if preferred) ---
// This endpoint handles single file uploads. 'file' is the field name in the form-data.
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Please select a file to upload.' });
  }
  // req.file contains information about the uploaded file (e.g., filename, path, size)
  // The file is already saved to the uploadsDir by Multer.
  // We return a publicly accessible path to the file.
  const relativeFilePath = `/uploads/${req.file.filename}`;
  res.status(200).json({ 
    message: 'File uploaded successfully!', 
    filePath: relativeFilePath, // This path can be used by the frontend to display/access the image
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size
  });
});

// --- Error Handling Middleware (Basic) ---
// This should be one of the last middleware functions added.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Global error handler:", err.stack);
  // If the error is from Multer (e.g., file too large)
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  }
  // For other errors
  res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Attempting to load .env from: ${path.resolve(__dirname, '..', '.env')}`);
  console.log(`JWT_SECRET from env: ${process.env.JWT_SECRET ? 'Loaded (first few chars: ' + process.env.JWT_SECRET.substring(0,5) + '...)' : 'NOT Loaded or Empty'}`);
  console.log(`Serving uploaded files from static path /uploads, mapped to directory: ${uploadsDir}`);
});

export default app; // Export app for potential serverless deployment or testing