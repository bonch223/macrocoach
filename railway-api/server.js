const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}.jpg`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload image endpoint
app.post('/api/upload', async (req, res) => {
  try {
    // Check if it's a base64 upload (JSON) or file upload (multipart)
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      // Handle base64 upload
      const { base64Data, clientId, type, fileName } = req.body;
      
      if (!base64Data || !clientId || !type) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing base64Data, clientId, or type' 
        });
      }

      // Process base64 image
      const processedImagePath = path.join(uploadsDir, fileName || `base64-${Date.now()}.jpg`);
      
      // Convert base64 to buffer and process with Sharp
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      await sharp(imageBuffer)
        .resize(400, 400, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toFile(processedImagePath);

      // Generate public URL
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;
      const imageUrl = `${baseUrl}/${path.basename(processedImagePath)}`;

      console.log('Base64 image uploaded successfully:', {
        clientId,
        type,
        filename: path.basename(processedImagePath),
        url: imageUrl
      });

      res.json({
        success: true,
        url: imageUrl,
        filename: path.basename(processedImagePath),
        size: imageBuffer.length
      });

    } else {
      // Handle file upload (multipart)
      upload.single('file')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ 
            success: false, 
            error: 'File upload error: ' + err.message 
          });
        }

        if (!req.file) {
          return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded' 
          });
        }

        const { clientId, type, base64Data } = req.body;
    
    if (!clientId || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing clientId or type' 
      });
    }

    // Process image with Sharp for optimization
    const processedImagePath = path.join(uploadsDir, `processed-${req.file.filename}`);
    
    await sharp(req.file.path)
      .resize(400, 400, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toFile(processedImagePath);

    // Clean up original file
    await fs.remove(req.file.path);

    // Generate public URL
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN || `http://localhost:${PORT}`;
    const imageUrl = `${baseUrl}/${path.basename(processedImagePath)}`;

    console.log('Image uploaded successfully:', {
      clientId,
      type,
      filename: req.file.filename,
      url: imageUrl
    });

    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
      size: req.file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process image' 
    });
  }
});

// Delete image endpoint
app.delete('/api/delete', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing imageUrl' 
      });
    }

    // Extract filename from URL
    const filename = path.basename(imageUrl);
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists and delete
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log('Image deleted successfully:', filename);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete image' 
    });
  }
});

// Get image info endpoint
app.get('/api/info/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      res.json({
        success: true,
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get file info' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Railway API server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});
