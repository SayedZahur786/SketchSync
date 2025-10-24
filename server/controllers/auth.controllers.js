import User from '../models/user.models.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '30d' }
  );
};

// @desc    Register new user
// @route   POST /api/v1/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      isGuest: false
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isGuest: false,
        rooms: user.rooms || []
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login using MongoDB native to avoid schema issues
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Get user data using MongoDB native driver to bypass Mongoose schema validation
    const userDoc = await User.collection.findOne({ _id: user._id });

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isGuest: false,
        rooms: userDoc.rooms || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isGuest: user.isGuest,
        rooms: user.rooms || [],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Create guest session
// @route   POST /api/v1/auth/guest
// @access  Public
export const createGuestSession = async (req, res) => {
  try {
    // Create a temporary guest user
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const guestUser = await User.create({
      name: `Guest_${Date.now().toString().slice(-6)}`,
      email: `${guestId}@guest.temp`,
      password: Math.random().toString(36).substr(2, 15), // Random password
      isGuest: true,
      guestRoomCount: 0
    });

    // Generate token (shorter expiry for guests)
    const token = jwt.sign(
      { id: guestUser._id, isGuest: true },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' } // 7 days for guest
    );

    res.status(201).json({
      success: true,
      message: 'Guest session created',
      token,
      user: {
        id: guestUser._id,
        name: guestUser.name,
        isGuest: true,
        guestRoomCount: 0,
        rooms: []
      }
    });
  } catch (error) {
    console.error('Guest session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating guest session',
      error: error.message
    });
  }
};

// @desc    Convert guest to registered user
// @route   POST /api/v1/auth/convert-guest
// @access  Private (Guest)
export const convertGuestToUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Find guest user
    const guestUser = await User.findById(req.user.id);
    if (!guestUser || !guestUser.isGuest) {
      return res.status(400).json({
        success: false,
        message: 'Invalid guest session'
      });
    }

    // Update guest to registered user
    guestUser.name = name;
    guestUser.email = email;
    guestUser.password = password;
    guestUser.isGuest = false;
    await guestUser.save();

    // Generate new token
    const token = generateToken(guestUser._id);

    res.status(200).json({
      success: true,
      message: 'Account created successfully! Your rooms have been saved.',
      token,
      user: {
        id: guestUser._id,
        name: guestUser.name,
        email: guestUser.email,
        avatar: guestUser.avatar,
        isGuest: false,
        rooms: guestUser.rooms || []
      }
    });
  } catch (error) {
    console.error('Convert guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting guest account',
      error: error.message
    });
  }
};

// @desc    Save room to user
// @route   POST /api/v1/auth/save-room
// @access  Private
export const saveRoom = async (req, res) => {
  try {
    console.log('=== saveRoom called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request user:', req.user ? { id: req.user.id, name: req.user.name, email: req.user.email } : 'No user');
    
    const { roomId, name, type, isCollaborative } = req.body;

    if (!req.user || !req.user.id) {
      console.error('No user found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log('Finding user by ID:', req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.error('User not found in database:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found:', { id: user.id, name: user.name, roomsCount: user.rooms?.length });
    console.log('User rooms before:', user.rooms);
    console.log('User rooms type:', typeof user.rooms, Array.isArray(user.rooms));

    // Fix for corrupted rooms field - force it to be an array using direct MongoDB update
    if (!Array.isArray(user.rooms)) {
      console.log('Rooms field is corrupted or not an array, fixing with direct MongoDB update...');
      await User.updateOne(
        { _id: req.user.id },
        { $set: { rooms: [] } }
      );
      // Reload the user with the fixed schema
      const fixedUser = await User.findById(req.user.id);
      if (!fixedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found after fix'
        });
      }
      // Replace the user object with the fixed one
      Object.assign(user, fixedUser._doc);
      console.log('Rooms field fixed, user reloaded');
    }

    // Check if room already exists
    const existingRoom = user.rooms.find(r => r && r.roomId === roomId);
    
    const newRoomData = {
      roomId,
      name,
      type,
      isCollaborative,
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    
    console.log('Adding new room:', newRoomData);
    
    if (existingRoom) {
      // Update last accessed using MongoDB native driver
      await User.collection.updateOne(
        { _id: user._id, 'rooms.roomId': roomId },
        { 
          $set: { 
            'rooms.$.lastAccessed': new Date(),
            'rooms.$.name': name
          }
        }
      );
    } else {
      // Use MongoDB native collection to completely bypass Mongoose
      const updateResult = await User.collection.updateOne(
        { _id: user._id },
        { 
          $push: { 
            rooms: { 
              $each: [newRoomData], 
              $position: 0 
            }
          },
          ...(user.isGuest ? { $inc: { guestRoomCount: 1 } } : {})
        }
      );
      
      console.log('Update result:', updateResult);
    }

    // Reload user to get updated data
    const updatedUser = await User.findById(req.user.id);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    console.log('Room saved successfully');
    res.status(200).json({
      success: true,
      message: 'Room saved',
      guestRoomCount: updatedUser.guestRoomCount || user.guestRoomCount,
      shouldPromptSignup: updatedUser.isGuest && (updatedUser.guestRoomCount || 0) >= 3
    });
  } catch (error) {
    console.error('=== Save room error ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error saving room',
      error: error.message,
      errorDetails: error.toString()
    });
  }
};

// @desc    Get user rooms
// @route   GET /api/v1/auth/rooms
// @access  Private
export const getUserRooms = async (req, res) => {
  try {
    console.log('=== getUserRooms called ===');
    console.log('User ID:', req.user.id);
    
    // Use MongoDB native driver to bypass Mongoose schema issues
    const userDoc = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(req.user.id) });
    
    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Raw rooms from DB:', userDoc.rooms);
    console.log('Rooms count:', userDoc.rooms?.length || 0);

    res.status(200).json({
      success: true,
      rooms: userDoc.rooms || []
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms',
      error: error.message
    });
  }
};
