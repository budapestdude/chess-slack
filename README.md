# ChessSlack

A full-featured Slack clone built specifically for chess businesses, combining standard communication features with chess-specific functionality for managing multiple chess sites, tournaments, and player communities.

## Features Implemented (Phase 1 - Foundation)

### Core Slack Features
- ✅ User authentication (registration, login, JWT tokens)
- ✅ Workspace management (create, view, update, delete)
- ✅ Channel management (public/private channels, join/leave)
- ✅ Real-time WebSocket infrastructure
- ✅ Role-based access control (owner, admin, member, guest)
- ✅ Responsive UI with Tailwind CSS

### Architecture
- **Backend**: Node.js + Express + TypeScript + Socket.IO
- **Frontend**: React + Vite + TypeScript + Redux Toolkit + Tailwind CSS
- **Database**: PostgreSQL with comprehensive schema
- **Cache**: Redis for sessions and real-time features
- **WebSocket**: Socket.IO for real-time communication

## Project Structure

```
ChessSlack/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── database/        # DB connection & migrations
│   │   ├── websocket/       # Socket.IO handlers
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store & slices
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml       # Docker services
```

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional, recommended)

## Setup Instructions

### Option 1: Using Docker Compose (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd ChessSlack
   ```

2. **Start all services**:
   ```bash
   docker compose up -d
   ```

3. **Run database migrations**:
   ```bash
   docker compose exec backend npm run migrate
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Option 2: Local Development (Without Docker)

1. **Start PostgreSQL**:
   ```bash
   # Install and start PostgreSQL
   brew install postgresql@16
   brew services start postgresql@16

   # Create database
   createdb chessslack
   ```

2. **Start Redis**:
   ```bash
   # Install and start Redis
   brew install redis
   brew services start redis
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

4. **Configure backend environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run database migrations**:
   ```bash
   npm run migrate
   ```

6. **Start backend server**:
   ```bash
   npm run dev
   # Server runs on http://localhost:3001
   ```

7. **Install frontend dependencies** (in a new terminal):
   ```bash
   cd frontend
   npm install
   ```

8. **Configure frontend environment**:
   ```bash
   cp .env.example .env
   ```

9. **Start frontend dev server**:
   ```bash
   npm run dev
   # App runs on http://localhost:5173
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - Get all user workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Channels
- `POST /api/workspaces/:workspaceId/channels` - Create channel
- `GET /api/workspaces/:workspaceId/channels` - Get all channels
- `GET /api/workspaces/:workspaceId/channels/:id` - Get channel details
- `PUT /api/workspaces/:workspaceId/channels/:id` - Update channel
- `DELETE /api/workspaces/:workspaceId/channels/:id` - Delete channel
- `POST /api/workspaces/:workspaceId/channels/:id/join` - Join channel
- `POST /api/workspaces/:workspaceId/channels/:id/leave` - Leave channel

## Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **users** - User accounts and profiles
- **workspaces** - Workspace/organization data
- **workspace_members** - User-workspace relationships
- **channels** - Communication channels
- **channel_members** - Channel membership
- **messages** - All messages (channels + DMs)
- **message_reactions** - Emoji reactions
- **message_threads** - Threaded replies
- **dm_groups** - Direct message groups
- **files** - File metadata
- **notifications** - User notifications
- **sessions** - Active user sessions

### Chess-Specific Tables (Ready for Phase 4)
- **chess_games** - Game records
- **chess_positions** - Board positions
- **tournaments** - Tournament data
- **tournament_players** - Player registrations
- **chess_sites** - Multiple site management
- **player_ratings** - Rating history

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm run start      # Start production server
npm run migrate    # Run database migrations
npm test           # Run tests
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Next Steps (Upcoming Phases)

### Phase 2: Core Messaging (Weeks 4-6)
- [ ] Real-time message sending/receiving
- [ ] Message threading
- [ ] Message reactions
- [ ] Typing indicators
- [ ] File upload and sharing
- [ ] Rich text formatting

### Phase 3: Enhanced UX (Weeks 7-9)
- [ ] Full-text search
- [ ] Notifications system
- [ ] Message editing/deletion
- [ ] Dark mode
- [ ] Emoji picker
- [ ] User presence system

### Phase 4: Chess Integration (Weeks 10-12)
- [ ] Embedded chessboard component
- [ ] Live game sharing
- [ ] PGN import/export
- [ ] Stockfish engine integration
- [ ] Tournament management
- [ ] Player profiles and ratings

### Phase 5: Advanced Chess Features (Weeks 13-15)
- [ ] Game analysis tools
- [ ] Study groups
- [ ] Coach-student features
- [ ] Lesson scheduling
- [ ] Payment integration

### Phase 6: Polish & Launch (Weeks 16-18)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Mobile responsiveness
- [ ] Comprehensive documentation
- [ ] Production deployment

## Technology Stack

### Backend
- Node.js 20
- Express.js
- TypeScript
- Socket.IO
- PostgreSQL
- Redis
- JWT Authentication
- Zod validation

### Frontend
- React 18
- Vite
- TypeScript
- Redux Toolkit
- React Router
- Tailwind CSS
- Headless UI
- Heroicons
- Socket.IO Client

### Development Tools
- Docker & Docker Compose
- ESLint
- Jest (testing)
- tsx (TypeScript execution)

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://chessslack:password@localhost:5432/chessslack
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Contributing

This project follows a phased development approach. Please ensure all new features:
1. Include TypeScript types
2. Have proper error handling
3. Follow the existing code structure
4. Include appropriate comments

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

---

**Status**: Phase 1 Complete ✅
**Next Up**: Phase 2 - Core Messaging Features
**Timeline**: 18 weeks to full production release