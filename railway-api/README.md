# MacroCoach Railway API

This is the backend API for MacroCoach image storage, deployed on Railway.

## Features

- Image upload with automatic compression and optimization
- Image deletion
- File info retrieval
- CORS enabled for cross-origin requests
- Health check endpoint

## Deployment

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js project
3. The API will be available at your Railway domain

## Environment Variables

- `PORT`: Server port (default: 3000)
- `RAILWAY_PUBLIC_DOMAIN`: Your Railway app domain (auto-set by Railway)

## API Endpoints

### Health Check
```
GET /health
```

### Upload Image
```
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: Image file
- clientId: Client ID
- type: Image type (weight/progress/client)
- base64Data: Base64 encoded image data
```

### Delete Image
```
DELETE /api/delete
Content-Type: application/json

Body:
{
  "imageUrl": "https://your-domain.com/filename.jpg"
}
```

### Get Image Info
```
GET /api/info/:filename
```

## Local Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```

## File Structure

- `uploads/`: Directory for storing uploaded images
- Images are automatically compressed to 400x400 max resolution
- JPEG quality set to 80% for optimal file size
