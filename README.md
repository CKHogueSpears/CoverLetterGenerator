# AI-Powered Cover Letter Generator

An advanced AI-powered platform that helps job seekers create optimized, ATS-friendly cover letters through intelligent multi-agent workflows and secure authentication.

## Features

### 🤖 AI-Powered Generation
- Multi-agent processing pipeline for document optimization
- Claude AI-powered coherence refinement
- ATS keyword optimization
- Style guide compliance analysis

### 🔐 Secure Authentication
- Google OAuth integration
- Secure session management
- User-specific document storage

### 📄 Document Processing
- Resume upload and analysis
- Job description parsing
- Cover letter template generation
- DOCX export functionality

### 🎯 Intelligent Optimization
- Automatic keyword extraction from job descriptions
- Requirements mapping to user accomplishments
- Quality scoring and validation
- Real-time progress tracking

## Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for API routes
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Claude AI** and **OpenAI** for content generation

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **TanStack Query** for data fetching
- **Wouter** for routing

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Google OAuth credentials
- OpenAI API key
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-cover-letter-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy and configure your environment variables
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `SESSION_SECRET` - Session encryption secret

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   ├── pipeline.ts        # Cover letter generation pipeline
│   ├── multiAgentPipeline.ts # Multi-agent processing
│   ├── anthropic.ts       # Claude AI integration
│   ├── openai.ts          # OpenAI integration
│   ├── googleAuth.ts      # Authentication setup
│   └── documentProcessor.ts # Document handling
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema definitions
└── attached_assets/       # Static assets
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/logout` - User logout

### Documents
- `GET /api/documents` - Get user documents
- `POST /api/documents` - Upload document
- `DELETE /api/documents/:id` - Delete document

### Job Descriptions
- `GET /api/job-descriptions` - Get job descriptions
- `POST /api/job-descriptions` - Create job description
- `PUT /api/job-descriptions/:id` - Update job description

### Cover Letters
- `GET /api/cover-letters` - Get cover letters
- `POST /api/cover-letters` - Create cover letter
- `GET /api/cover-letters/:id/download` - Download as DOCX

## Development

### Database Migrations
Use Drizzle's push command to sync schema changes:
```bash
npm run db:push
```

### Code Quality
The project uses TypeScript for type safety and follows modern React patterns with hooks and functional components.

### Caching
Implements intelligent caching for:
- Style guide analysis
- Resume embeddings
- Cover letter data
- API responses

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.