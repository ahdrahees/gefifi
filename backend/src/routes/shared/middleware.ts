import multer from 'multer';

// --- Multer Configuration for Entity Attachments ---
export const attachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit per file
        files: 20 // Maximum files per request (higher than individual entity limits for flexibility)
    },
    fileFilter: (req, file, cb) => {
        // Accept common construction-related file types
        const allowedTypes = [
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // CAD files (some browsers may not set MIME types correctly for these)
            'application/octet-stream' // For .dwg, .dxf files
        ];

        if (
            allowedTypes.includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.dwg') ||
            file.originalname.toLowerCase().endsWith('.dxf')
        ) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `File type not allowed: ${file.mimetype}. Allowed types: images, PDF, Word, Excel, DWG, DXF.`
                )
            );
        }
    }
});

// --- Multer Configuration for Avatar Uploads ---
export const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
        files: 1 // Only one avatar file per request
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files for avatars
        const allowedImageTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ];

        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `File type not allowed: ${file.mimetype}. Only image files (JPG, PNG, GIF, WebP, SVG) are allowed for avatars.`
                )
            );
        }
    }
});

// --- Multer Configuration for Chat File Attachments ---
export const chatFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 30 * 1024 * 1024, // 30MB limit per file for chat attachments
        files: 1 // Only one file per request for chat
    },
    fileFilter: (req, file, cb) => {
        // Accept common construction-related file types
        const allowedTypes = [
            // Images
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            // CAD files (some browsers may not set MIME types correctly for these)
            'application/octet-stream' // For .dwg, .dxf files
        ];

        if (
            allowedTypes.includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.dwg') ||
            file.originalname.toLowerCase().endsWith('.dxf')
        ) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    `File type not allowed: ${file.mimetype}. Allowed types: images, PDF, Word, Excel, DWG, DXF.`
                )
            );
        }
    }
});
