# Changelog

All notable changes to the AI Cover Letter Generator project will be documented in this file.

## [2.0.0] - 2025-06-21

### Added
- **Multi-Agent Pipeline**: Implemented 7 concurrent AI agents for parallel content generation
- **Enhanced Validation**: New quantitative accomplishment extraction and scoring system
- **Intelligent Caching**: Multi-layer caching with 24hr TTL for style guides and resume embeddings
- **Real-time Progress**: WebSocket-based live tracking of generation pipeline
- **Professional DOCX Output**: Enhanced document generation with proper formatting
- **ATS Optimization**: Advanced keyword extraction and optimization for Applicant Tracking Systems
- **Style Guide Learning**: Adaptive writing style analysis and application

### Improved
- **Validation Accuracy**: Increased from 31% to 100% with enhanced pattern matching
- **Performance**: Pipeline execution optimized to ~18 seconds with parallel processing
- **User Experience**: Added progress indicators and quality metrics display
- **Error Handling**: Enhanced JSON parsing with better error recovery
- **Database Schema**: Expanded to support multi-agent workflow and quality scoring

### Technical Enhancements
- OpenAI GPT-4o integration for content generation
- Anthropic Claude 3.5 Sonnet for coherence refinement
- PostgreSQL with Drizzle ORM for data persistence
- React Query for optimized server state management
- Tailwind CSS with shadcn/ui components

### Fixed
- Production deployment compatibility issues
- Memory optimization for large document processing
- Session management stability
- Cache invalidation edge cases

## [1.0.0] - 2025-05-01

### Added
- Initial release with basic cover letter generation
- Google OAuth authentication
- Document upload functionality
- Basic job description processing
- Simple template-based output

### Features
- Single-agent AI processing
- Basic validation system
- File upload support
- User authentication
- Simple cover letter templates