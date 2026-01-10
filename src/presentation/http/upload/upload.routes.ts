import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UploadController } from './upload.controller';
import { webAuth } from '../../../middlewares/web-auth.middleware';

const router = Router();
const controller = new UploadController();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'images';
    const dest = path.join('uploads', type);
    
    // Ensure directory exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Routes
// Protected by webAuth if needed, or public for testing
router.post('/', webAuth, upload.single('file'), controller.uploadFile);

export default router;
