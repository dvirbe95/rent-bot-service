import { Request, Response } from 'express';
import path from 'path';

export class UploadController {
  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const fileType = req.body.type || 'images'; // images or documents
      const fileName = req.file.filename;
      const publicUrl = `https://rent-bot-service-cncl.onrender.com/uploads/${fileType}/${fileName}`;

      res.json({
        success: true,
        url: publicUrl,
        fileName: fileName
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error during upload' });
    }
  };
}
