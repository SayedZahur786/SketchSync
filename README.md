# SketchSync - Collaborative Whiteboard

A real-time collaborative whiteboard application built with the MERN stack and Socket.IO. Create rooms, draw together, and collaborate in real-time with seamless synchronization across all connected users.

---

##  Features

###  Real-Time Collaboration
- **Live Drawing Sync** - All drawing actions synchronized instantly across users
- **Real-Time Cursors** - See other users' cursor positions with unique colors
- **Sticky Notes & Text Sync** - Collaborative sticky notes and text boxes update in real-time
- **Active User Count** - See how many users are currently in the room
- **Socket.IO Integration** - Seamless real-time communication

###  Room Management
- **Personal Rooms** - Create private rooms for individual work
- **Collaborative Rooms** - Share room codes for team collaboration
- **Room Persistence** - Rooms are saved and accessible from the dashboard
- **Guest Mode** - Use the app without authentication (limited to 3 rooms)
- **User Dashboard** - View and manage all your created rooms
- **Auto-Save** - Room creator's work is automatically saved

###  User Experience
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works seamlessly across devices
- **Intuitive Toolbar** - Easy-to-use drawing controls
- **Authentication** - JWT-based secure authentication for registered users
- **Guest Sessions** - Quick start without registration

###  Drawing Tools
- **Pencil Tool** - Freehand drawing with adjustable stroke width
- **Eraser Tool** - Remove unwanted strokes
- **Color Palette** - Multiple color options for creative expression
- **Sticky Notes** - Add collaborative sticky notes to the canvas
- **Text Boxes** - Insert and edit text directly on the whiteboard
- **Clear Canvas** - Reset the entire canvas with one click

---

##  Tech Stack

### Frontend
- **React 19.1.0** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **React Router v6** - Client-side routing
- **Socket.IO Client** - Real-time WebSocket communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB Atlas** - Cloud-hosted NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.IO** - Real-time bidirectional communication
- **JWT (jsonwebtoken)** - Secure authentication tokens
- **bcryptjs** - Password hashing

### State Management
- **React Context API** - Global state management for authentication and dark mode

---

##  Key Functionalities

1. **Authentication System**
   - User registration and login with JWT tokens
   - Guest mode for quick access
   - Session management with localStorage
   - Protected routes for authenticated users

2. **Drawing Canvas**
   - HTML5 Canvas API for smooth drawing
   - Adjustable brush size and color selection
   - Eraser functionality
   - Real-time stroke synchronization

3. **Collaborative Features**
   - Room-based collaboration with unique room IDs
   - Real-time cursor tracking with user identification
   - Sticky notes and text boxes with live updates
   - Socket.IO event-driven architecture

4. **Room Persistence**
   - Rooms saved to MongoDB for authenticated users
   - localStorage fallback for guest users
   - Room metadata (name, type, timestamps)
   - Dashboard for room management

5. **Dark Mode**
   - System-wide theme toggle
   - Canvas theme adaptation (black background with white grid)
   - Persistent theme preference

---

##  Project Structure

`
Collaborative-Whiteboard/
 client/                    # React frontend
    src/
       components/        # React components
          Whiteboard.jsx
          DrawingCanvas.jsx
          Toolbar.jsx
          UserCursors.jsx
          RoomJoin.jsx
          Dashboard.jsx
       context/           # Context providers
          AuthContext.jsx
          DarkModeContext.jsx
       App.jsx
       main.jsx
       socket.js          # Socket.IO client setup
    package.json
    vite.config.js

 server/                    # Node.js backend
    controllers/           # Route controllers
       auth.controllers.js
       room.controllers.js
    models/                # Mongoose schemas
       user.models.js
       room.models.js
    routes/                # API routes
       auth.routes.js
       main.routes.js
    middleware/            # Custom middleware
       auth.middleware.js
    socket/                # Socket.IO handlers
       socketHandlers.js
    db/                    # Database connection
       db.js
    server.js              # Entry point
    package.json

 README.md
`

---