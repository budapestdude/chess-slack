# ChessSlack - Comprehensive Workspace Hub

ChessSlack is a modern, all-in-one workspace collaboration platform combining features from Slack, Asana, Trello, Notion, and Google Calendar. Built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Features

### 💬 **Core Messaging** (Foundation)
- ✅ User authentication (registration, login, JWT tokens)
- ✅ Workspace management (create, view, update, delete)
- ✅ Public and private channels
- ✅ Real-time messaging with Socket.IO
- ✅ Direct messages (1-on-1 and group)
- ✅ Message threads and reactions
- ✅ File uploads and attachments
- ✅ Role-based access control (owner, admin, member, guest)
- ✅ User presence system

### 🎯 **Phase 1: Task Management**
- ✅ User-assignable tasks with custom statuses
- ✅ Task labels and color-coding
- ✅ Kanban board view
- ✅ Task comments and discussions
- ✅ Task watchers and notifications

### 📅 **Phase 2: Calendar & Scheduling**
- ✅ Team calendar with month/week/day views
- ✅ Event creation and management
- ✅ RSVP and attendee management
- ✅ Recurring events support
- ✅ User availability tracking
- ✅ Meeting room booking
- ✅ Conflict detection

### 📝 **Phase 3: Documents & Wiki**
- ✅ Rich text document editor (Notion-like)
- ✅ Document versioning and history
- ✅ Permission-based collaboration (view/comment/edit/admin)
- ✅ Full-text search across documents
- ✅ Threaded comments with inline support
- ✅ Document folders and organization
- ✅ Wiki categories and namespaces
- ✅ Favorites and recent documents

### 📊 **Phase 4: Dashboard & Analytics**
- ✅ Real-time workspace overview
- ✅ Activity feed with user actions
- ✅ Task completion charts
- ✅ Document activity trends
- ✅ Team productivity metrics
- ✅ User-specific analytics
- ✅ Interactive data visualizations with Recharts

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Socket.IO Client** for real-time communication
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for API calls
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** for database
- **Socket.IO** for WebSockets
- **JWT** for authentication
- **Zod** for validation
- **Winston** for logging
- **Helmet** for security headers
- **Express Rate Limit** for rate limiting

### Infrastructure
- **Railway** for deployment
- **PostgreSQL** database (Railway provided)
- **Redis** (optional) for caching
- **Sentry** (optional) for error tracking

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

## Quick Start (Development)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/chessslack.git
cd chessslack
```

### 2. Setup Backend
```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/chessslack
# JWT_SECRET=your-secret-key-min-32-chars

# Run migrations
npm run migrate

# Start development server
npm run dev
```

Backend will start on http://localhost:3001

### 3. Setup Frontend
```bash
cd ../frontend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env if needed (defaults should work)
# VITE_API_URL=http://localhost:3001
# VITE_WS_URL=http://localhost:3001

# Start development server
npm run dev
```

Frontend will start on http://localhost:5173

### 4. Access the Application
Open http://localhost:5173 in your browser

## Railway Deployment

See **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** for comprehensive deployment instructions.

### Quick Deploy to Railway

1. **Create Railway Project** with PostgreSQL database
2. **Deploy Backend** - Set root directory to `backend`, add env vars
3. **Deploy Frontend** - Set root directory to `frontend`, add env vars
4. **Update CORS** - Set backend `CORS_ORIGIN` to frontend URL

Full step-by-step guide available in the deployment documentation.

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

## Status

**✅ All Phases Complete!**

- ✅ Foundation: Core messaging and real-time communication
- ✅ Phase 1: Task management system
- ✅ Phase 2: Calendar and scheduling
- ✅ Phase 3: Document management and wiki
- ✅ Phase 4: Dashboard and analytics

**Ready for Production Deployment**

Last Updated: 2025
Version: 1.0.0