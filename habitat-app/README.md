# Habitat Visualizer

A Next.js application for uploading and visualizing habitat images with authentication and metadata management.

## Features

- **User Authentication**
  - Email/password authentication
  - Google OAuth integration
  - Protected routes and API endpoints

- **Habitat Management**
  - Upload habitat images
  - Add metadata (location, date, notes)
  - Search existing habitat names
  - View image gallery with details

- **Responsive Design**
  - Mobile-friendly interface
  - Clean and intuitive UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 13 with App Router, React
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **File Storage**: Local storage (for development)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MongoDB database
- Google OAuth credentials (for Google Sign-in)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/habitat-visualizer.git
   cd habitat-visualizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Setting up Google OAuth

1. Go to the [Google Developer Console](https://console.developers.google.com/)
2. Create a new project
3. Navigate to "Credentials" and create an OAuth client ID
4. Set the authorized JavaScript origins to `http://localhost:3000`
5. Set the authorized redirect URI to `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local` file

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # API endpoints
│   │   ├── auth/         # Authentication API
│   │   ├── habitats/     # Habitat management API
│   │   └── upload/       # File upload API
│   ├── auth/             # Authentication pages
│   │   ├── signin/       # Sign-in page
│   │   └── signup/       # Sign-up page
│   ├── habitats/         # Habitat visualization pages
│   └── protected/        # Protected routes
├── components/           # React components
│   ├── auth-provider.jsx # Authentication provider
│   ├── habitat/          # Habitat-related components
│   └── ui/               # UI components
├── lib/                  # Utility functions
│   └── mongodb.js        # MongoDB connection
└── models/               # Database models
    ├── Habitat.js        # Habitat model
    └── User.js           # User model
```

## Usage

1. Sign up for an account or sign in with Google
2. Navigate to the Habitats page
3. Click "Upload New Habitat" to add a new habitat image
4. Fill in the required information:
   - Habitat name (with autocomplete from existing names)
   - Location
   - Date (optional)
   - Notes (optional)
5. Upload an image
6. View all habitats in the gallery
7. Click on any habitat to see detailed information

## Future Enhancements

- Migration to cloud storage for image handling
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

---

Created by Amit Singh
