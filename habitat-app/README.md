# Habitat Visualizer

A Next.js application for uploading and visualizing habitat images with authentication, metadata management, and interactive map views.

## Features

- **User Authentication**
  - Email/password authentication
  - Google OAuth integration
  - Protected routes and API endpoints

- **Habitat Management**
  - Upload habitat images (stored on Cloudinary)
  - Add metadata (location, GPS coordinates, date, notes)
  - Vegetation classification (Class / Order / Alliance)
  - Search existing habitat names
  - View image gallery with details

- **Interactive Maps**
  - GPS coordinate capture and display
  - Leaflet-powered aerial map view

- **Community Features**
  - Browse all user-contributed habitats
  - Download habitat data

- **Responsive Design**
  - Mobile-friendly interface
  - Clean and intuitive UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16 with App Router, React
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Cloudinary
- **Maps**: Leaflet / React Leaflet

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- pnpm (recommended) or npm
- MongoDB database
- Google OAuth credentials (for Google Sign-in)
- Cloudinary account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amsingh1/habitatVisualiser.git
   cd habitatVisualiser/habitat-app
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file in the `habitat-app` directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_URL=https://your-production-domain.com   # use http://localhost:3001 for local dev
   NEXTAUTH_SECRET=your_nextauth_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

### Setting up Google OAuth

1. Go to the [Google Developer Console](https://console.developers.google.com/)
2. Create a new project
3. Navigate to "Credentials" and create an OAuth client ID
4. Set the authorized JavaScript origins to your app URL (e.g. `http://localhost:3001`)
5. Set the authorized redirect URI to `<your-app-url>/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local` file

### Docker Deployment

The app includes a `Dockerfile` and `docker-compose.yml` for containerised deployment.

> **Important**: Secrets are injected at runtime via the `env_file` directive in `docker-compose.yml`. Never commit `.env.local` and never bake secrets into the Docker image.

1. Create your `.env.local` with production values (set `NEXTAUTH_URL` to your public server URL)
2. Build and start:
   ```bash
   docker compose up -d --build
   ```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # API endpoints
│   │   ├── auth/         # Authentication API
│   │   ├── habitats/     # Habitat management API
│   │   └── upload/       # File upload API (Cloudinary)
│   ├── auth/             # Authentication pages
│   │   ├── signin/       # Sign-in page
│   │   └── signup/       # Sign-up page
│   ├── community/        # Community habitat browse page
│   ├── habitats/         # Habitat visualization pages
│   ├── my-images/        # User's own habitats
│   └── protected/        # Protected routes
├── components/           # React components
│   ├── auth-provider.jsx # Authentication provider
│   ├── habitat/          # Habitat-related components
│   └── ui/               # UI components
├── lib/                  # Utility functions
│   └── mongodb.js        # MongoDB connection
└── models/               # Database models
    ├── Habitat.js        # Habitat model
    ├── User.js           # User model
    └── eu_veg_units.js   # EU vegetation classification model
```

## Usage

1. Sign up for an account or sign in with Google
2. Navigate to the Habitats page
3. Click "Upload New Habitat" to add a new habitat image
4. Fill in the required information:
   - Vegetation classification (Class / Order / Alliance)
   - Location (state and country)
   - GPS coordinates (optional)
   - Dominant species (optional)
   - Date and notes (optional)
5. Upload an image
6. View all habitats in the gallery or on the map

## Future Enhancements

- Advanced filtering and search capabilities
- User profile management
- Commenting and social features
- Mobile app conversion using PWA or Capacitor

## License

[MIT](LICENSE)

## Acknowledgements

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
- [MongoDB](https://www.mongodb.com)
- [Mongoose](https://mongoosejs.com)
- [Cloudinary](https://cloudinary.com)
- [Leaflet](https://leafletjs.com)

---

Created by Amit Singh
