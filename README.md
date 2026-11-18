# IntEGre Buddy App

**IntEGre Buddy App** is a complete, production-oriented, mobile-friendly web application designed to facilitate buddy matching between university students during physical student welcome events.

## Features

### Campaign Management
- ✅ Create new campaigns for university cities
- ✅ Generate unique QR codes for registration
- ✅ Download printable PDFs with QR codes
- ✅ Secure admin authentication with secret codes
- ✅ Automatic campaign expiration after 24 hours

### Student Registration
- ✅ Simple registration with name, year, and hobbies
- ✅ No email or password required
- ✅ Multiple hobby selection with predefined options
- ✅ Custom hobby entry
- ✅ Privacy notice with explicit consent
- ✅ Optional browser push notifications

### Matching Algorithm
- ✅ Deterministic matching algorithm (no AI required)
- ✅ Configurable old-to-new student ratios (e.g., 1:1, 1:2, 2:1)
- ✅ Configurable new-to-new group sizes (2-10 students)
- ✅ Hobby compatibility scoring with predefined relationships
- ✅ Maximizes number of students in valid groups first
- ✅ Then optimizes for hobby compatibility
- ✅ Snapshot-based batch processing for concurrency safety

### Administrator Dashboard
- ✅ Real-time updates via polling
- ✅ View campaign statistics
- ✅ List pending and matched students
- ✅ Filter and sort students
- ✅ Generate matches with configuration
- ✅ Preview matching results before confirmation

### Student Results
- ✅ Individual result pages for each student
- ✅ Fun nickname assignments (Shakespeare, Literature, Mythology, Pop Culture)
- ✅ Compatibility scores displayed
- ✅ Shared interests shown
- ✅ Themed illustrations

### Public Display
- ✅ Large screen projection interface
- ✅ Continuously scrolling match results
- ✅ Configurable scroll speed
- ✅ Pause/resume functionality
- ✅ Automatic updates when new matches are created

### Security & Privacy
- ✅ Secure password hashing (bcrypt)
- ✅ Secure session management
- ✅ Rate limiting protection
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Automatic data deletion after 24 hours
- ✅ No email addresses or phone numbers collected

## Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **UI**: Tailwind CSS with custom components
- **Build Tool**: Vite
- **PWA**: Service worker for offline support
- **QR Code**: qrcode library
- **PDF**: jsPDF library

### Backend
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: JWT-like tokens stored in database
- **API**: RESTful JSON API

### Hosting
- **Frontend**: Cloudflare Pages
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Domain**: Free Cloudflare subdomain (pages.dev)

## Quick Start

### Development

Use Node.js 22.12.0 or newer.

1. Clone the repository:
```bash
git clone https://github.com/ifejiofor/integre-buddy-app.git
cd integre-buddy-app
```

2. Install dependencies:
```bash
cd frontend
npm ci
cd ../backend
npm ci
```

3. Start the development servers:
```bash
# In one terminal
cd frontend
npm run dev

# In another terminal
cd backend
npm run dev
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

### Production

See the [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions on deploying to Cloudflare.

## Project Structure

```
├── frontend/                 # React frontend application
│   ├── public/               # Static assets
│   │   ├── sw.js             # Service worker for PWA
│   │   └── favicon.svg       # Application icon
│   ├── src/                  # Source code
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   ├── styles/            # CSS styles
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── tailwind.config.js     # Tailwind configuration
│
├── backend/                  # Cloudflare Workers backend
│   ├── src/                  # Source code
│   │   ├── handlers/          # API handlers
│   │   ├── services/          # Database services
│   │   ├── types.ts           # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   └── index.ts           # Main entry point
│   ├── package.json          # Backend dependencies
│   └── wrangler.toml          # Cloudflare configuration
│
├── database/                 # Database files
│   └── schema.sql            # Database schema
│
└── docs/                    # Documentation
    └── DEPLOYMENT.md        # Deployment guide
```

## Configuration

### Environment Variables

#### Frontend

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8787
VITE_PUSH_PUBLIC_KEY=your_vapid_public_key
```

#### Backend

Configure in `backend/wrangler.toml`:

```toml
[vars]
ENVIRONMENT=development
DEBUG=true
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## Testing

The application includes comprehensive error handling and validation. You can test:

- ✅ Campaign creation and management
- ✅ Student registration with validation
- ✅ Admin authentication
- ✅ Matching algorithm with different configurations
- ✅ Real-time updates
- ✅ Public display
- ✅ Campaign expiration

## Browser Compatibility

The application is tested and optimized for:

- Google Chrome (latest)
- Microsoft Edge (latest)
- Mozilla Firefox (latest)
- Safari (latest)
- Mobile Safari
- Chrome for Android

## Free Tier Compatibility

The application is designed to work within Cloudflare's free tier limits:

- ✅ No paid domain required
- ✅ No paid hosting subscription required
- ✅ No paid AI APIs required
- ✅ No Supabase or Firebase dependencies
- ✅ Uses only free Cloudflare services

## Privacy

- ✅ No email addresses collected
- ✅ No phone numbers collected
- ✅ No unnecessary personal information
- ✅ All data automatically deleted after 24 hours
- ✅ Campaign secret codes are hashed, not stored in plaintext
- ✅ Secure session management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is provided as-is for educational purposes. See the LICENSE file for details.

## Acknowledgments

- Cloudflare for providing free hosting and database services
- The open-source community for the libraries used
- All contributors to this project

## Contact

For questions or issues, please open an issue on GitHub.
