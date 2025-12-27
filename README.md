# Photogram API

A secure, scalable photo-sharing API built with Firebase, Express, and Google Secrets Manager.

## Features

- **Authentication**: Firebase Authentication with JWT token verification
- **Photo Management**: Category-based photo organization with pagination
- **Social Features**: Like/Unlike photos, view tracking
- **Security**: Helmet.js, CORS, rate limiting, input validation
- **Cloud Integration**: Firebase Realtime Database, Google Secrets Manager
- **Testing**: Comprehensive test suite with Bun test runner
- **TypeScript**: Full type safety and IDE support

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Firebase project with Realtime Database enabled
- Google Cloud project with Secrets Manager API enabled
- Service account key with appropriate permissions

## Installation

1. **Clone the repository**
   ```bash
   cd photogram
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your credentials:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

   # Google Cloud Configuration
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Set up Firebase Realtime Database**

   Your database should follow this structure:
   ```json
   {
     "photos": {
       "photoId": {
         "id": "photoId",
         "uid": "userId",
         "imageUrl": "https://...",
         "category": "People & Pets",
         "tags": ["tag1", "tag2"],
         "createdAt": 1234567890,
         "views": 0,
         "likes": 0
       }
     },
     "users": {
       "userId": {
         "uid": "userId",
         "name": "User Name",
         "email": "user@example.com",
         "numberOfUploads": 0,
         "totalViews": 0,
         "totalLikes": 0
       }
     },
     "likes": {
       "userId": {
         "photoId": {
           "uid": "userId",
           "photoId": "photoId",
           "createdAt": 1234567890
         }
       }
     }
   }
   ```

## Running the Application

**Development mode** (with auto-reload):
```bash
bun run dev
```

**Production mode**:
```bash
bun start
```

**Build**:
```bash
bun run build
```

**Run tests**:
```bash
bun test
```

**Run tests in watch mode**:
```bash
bun run test:watch
```

## API Endpoints

### Health Check
```http
GET /health
```
Returns API status and timestamp.

### Get Categories (Paginated)
```http
GET /photos/categories?page=1&pageSize=5
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (1-100, default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "Screenshots & Recordings": [
      {
        "photo": {
          "id": "-OdIwkXXzje-gkGg4OgJ",
          "uid": "cH427QobDog6dLxCF7eZ55yWXg72",
          "imageUrl": "https://...",
          "category": "Screenshots & Recordings",
          "tags": ["Text", "Font"],
          "createdAt": 1762345027784,
          "views": 0,
          "likes": 0
        },
        "user": {
          "name": null,
          "uid": "cH427QobDog6dLxCF7eZ55yWXg72",
          "email": "user@example.com",
          "numberOfUploads": 20,
          "totalViews": 0,
          "totalLikes": 0
        },
        "hasLiked": false
      }
    ]
  }
}
```

### View Photo
```http
POST /photos/{photoId}/view
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "View count incremented successfully"
}
```

### Toggle Like
```http
POST /like/toggle/{photoId}
Authorization: Bearer {token}
```

**Response (Like):**
```json
{
  "success": true,
  "message": "Like added successfully.",
  "data": {
    "hasLiked": true
  }
}
```

**Response (Unlike):**
```json
{
  "success": true,
  "message": "Like removed successfully.",
  "data": {
    "hasLiked": false
  }
}
```

## Security Features

1. **Authentication**: All photo and like endpoints require valid Firebase JWT tokens
2. **Helmet.js**: Sets secure HTTP headers
3. **CORS**: Configurable cross-origin resource sharing
4. **Rate Limiting**: Prevents abuse (100 requests per 15 minutes by default)
5. **Input Validation**: Request validation middleware
6. **Error Handling**: Secure error messages without exposing internals
7. **Secrets Management**: Google Secrets Manager for sensitive configuration

## Testing

The project includes comprehensive tests for:
- API endpoints (authentication, validation, responses)
- Service layer (business logic)
- Middleware (auth, validation, error handling)

Run tests:
```bash
bun test
```

## Project Structure

```
photogram/
├── src/
│   ├── config/          # Configuration (Firebase, Secrets Manager)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Authentication, validation, error handling
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript interfaces
│   ├── app.ts           # Express app setup
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Documentation
```

## Deployment

### Deploy to Google Cloud Run

1. Build Docker image:
   ```bash
   docker build -t gcr.io/PROJECT_ID/photogram-api .
   ```

2. Push to Container Registry:
   ```bash
   docker push gcr.io/PROJECT_ID/photogram-api
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy photogram-api \
     --image gcr.io/PROJECT_ID/photogram-api \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Environment Variables for Production

Set these in your deployment platform:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`
- `GOOGLE_CLOUD_PROJECT_ID`
- `NODE_ENV=production`
- `PORT=8080`
- `ALLOWED_ORIGINS`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Troubleshooting

### Firebase Connection Issues
- Verify `FIREBASE_DATABASE_URL` is correct
- Ensure service account has proper permissions
- Check Firebase Realtime Database rules

### Authentication Errors
- Verify Firebase tokens are valid and not expired
- Ensure `FIREBASE_PROJECT_ID` matches your Firebase project
- Check that `FIREBASE_PRIVATE_KEY` includes proper newlines

### Rate Limiting
- Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` in `.env`
- Consider implementing per-user rate limiting for production

## Support

For issues and questions, please open an issue on GitHub.

