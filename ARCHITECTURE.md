# System Architecture

## Overview

The AI Cover Letter Generator is a full-stack TypeScript application that uses a multi-agent AI pipeline to generate personalized, ATS-optimized cover letters.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Models**: OpenAI GPT-4o + Anthropic Claude 3.5 Sonnet
- **Authentication**: Google OAuth 2.0 with Passport.js

## System Components

### Frontend (`client/src/`)
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── agent-status.tsx    # Real-time agent progress
│   ├── document-upload.tsx # File upload interface
│   ├── job-description-form.tsx
│   ├── pipeline-status.tsx
│   ├── processing-modal.tsx
│   ├── quality-metrics.tsx
│   └── validation-details.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts     # Authentication state
│   ├── use-mobile.tsx # Mobile detection
│   └── use-toast.ts   # Toast notifications
├── lib/               # Utility functions
│   ├── apiKeyManager.ts   # API key management
│   ├── queryClient.ts     # TanStack Query setup
│   └── utils.ts          # General utilities
├── pages/             # Route components
│   ├── home.tsx      # Main application page
│   ├── login.tsx     # Authentication page
│   └── not-found.tsx # 404 page
├── App.tsx           # Main app component with routing
└── main.tsx          # Application entry point
```

### Backend (`server/`)
```
server/
├── aiServiceManager.ts      # AI service abstraction
├── anthropic.ts            # Claude integration
├── cache.ts               # Multi-layer caching system
├── db.ts                  # Database connection
├── documentProcessor.ts    # File processing & DOCX generation
├── googleAuth.ts          # OAuth authentication
├── index.ts              # Express server setup
├── multiAgentPipeline.ts  # Multi-agent orchestration
├── openai.ts             # OpenAI integration
├── optimizedValidation.ts # Resume validation system
├── pipeline.ts           # Legacy pipeline (backup)
├── routes.ts             # API route definitions
├── storage.ts            # Database operations
└── vite.ts              # Vite SSR integration
```

### Database Schema (`shared/schema.ts`)
```sql
users
├── id (primary key)
├── username, email, googleId
├── firstName, lastName
├── profileImageUrl
└── timestamps

documents
├── id (primary key)
├── userId (foreign key)
├── type (style_guide | resume | example_cover_letter)
├── filename, content
├── tags (array)
├── isActive
└── uploadedAt

job_descriptions
├── id (primary key)
├── userId (foreign key)
├── title, company, content
├── atsKeywords (array)
├── keyRequirements (array)
└── createdAt

cover_letters
├── id (primary key)
├── userId, jobDescriptionId (foreign keys)
├── content (jsonb)
├── quality scores (qualityScore, atsScore, etc.)
├── status, generationTime
├── validationResults (jsonb)
└── timestamps
```

## Multi-Agent Pipeline

### Agent Types
1. **ATS Keywords Agent** - Extracts job-relevant keywords
2. **Requirements Agent** - Identifies key job requirements
3. **Style Guide Agent** - Analyzes user writing style
4. **Resume Agent** - Processes resume achievements
5. **Opening Hook Agent** - Creates compelling openings
6. **Alignment Agent** - Aligns experience with requirements
7. **Leadership Agent** - Highlights leadership experience
8. **Value Props Agent** - Identifies unique value propositions
9. **Closing Agent** - Crafts professional closings
10. **Quality Agent** - Validates and scores output

### Execution Flow
```
Input: Job Description + User Data
    ↓
Parallel Agent Execution (1ms)
    ↓
Content Aggregation
    ↓
Claude Coherence Refinement (14s)
    ↓
Quality Validation & Scoring
    ↓
DOCX Generation
    ↓
Output: Professional Cover Letter
```

## Caching Strategy

### Three-Layer Cache System
1. **Style Guide Cache** (24hr TTL)
   - Raw document content
   - Processed style analysis
   
2. **Resume Embeddings Cache** (24hr TTL)
   - Raw resume content
   - Generated embeddings
   
3. **Cover Letter Data Cache** (1hr TTL)
   - Job-specific processed data
   - User-specific optimizations

### Cache Implementation
- In-memory storage with TTL
- User-specific cache keys
- Automatic invalidation on updates
- Cache hit rate monitoring

## API Design

### RESTful Endpoints
```
Authentication:
POST /api/auth/google     # Google OAuth login
GET  /api/auth/user       # Get current user
POST /api/auth/logout     # Logout

Documents:
GET    /api/documents           # List user documents
POST   /api/documents/upload    # Upload new document
DELETE /api/documents/:id       # Delete document

Job Descriptions:
GET  /api/job-descriptions      # List job descriptions
POST /api/job-descriptions      # Create new job description
PUT  /api/job-descriptions/:id  # Update job description

Cover Letters:
GET    /api/cover-letters              # List cover letters
POST   /api/cover-letters/generate     # Generate new cover letter
GET    /api/cover-letters/:id/download # Download DOCX
DELETE /api/cover-letters/:id          # Delete cover letter
```

## Security

### Authentication Flow
1. Google OAuth 2.0 redirect
2. JWT token generation
3. Session-based authentication
4. Middleware protection for routes

### Data Protection
- SQL injection prevention (Drizzle ORM)
- XSS protection (input sanitization)
- CORS configuration
- Secure session management
- Environment variable protection

## Performance Optimizations

### Frontend
- Code splitting with React.lazy()
- TanStack Query for server state
- Optimistic updates
- Component memoization

### Backend
- Connection pooling (PostgreSQL)
- Request/response compression
- Parallel AI agent execution
- Intelligent caching layers

### Database
- Indexed foreign keys
- JSONB for flexible schemas
- Connection pooling
- Query optimization

## Monitoring & Observability

### Metrics to Track
- Pipeline execution time
- Cache hit rates
- AI API usage and costs
- User engagement metrics
- Error rates and types

### Logging
- Structured logging with timestamps
- Agent execution tracking
- Error stack traces
- Performance metrics

## Scalability Considerations

### Horizontal Scaling
- Stateless server design
- External session storage
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Memory optimization for caching
- CPU optimization for AI processing
- Database connection limits
- Rate limiting for AI APIs