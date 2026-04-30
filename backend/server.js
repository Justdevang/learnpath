import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { generateRoadmap } from './services/geminiService.js';
import User from './models/User.js';
import Contact from './models/Contact.js';
import Email from './models/Email.js';
import Roadmap from './models/Roadmap.js';
import Glossary from './models/Glossary.js';
import { protect } from './middleware/authMiddleware.js';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnpath')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://learnpath.qzz.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any Render or Vercel deployed frontend
    if (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health Check Endpoint for Diagnostics
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: {
      geminiKey: !!process.env.GEMINI_API_KEY,
      youtubeKey: !!process.env.YOUTUBE_API_KEY,
      nodeVersion: process.version,
      port: process.env.PORT || 3001
    }
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased from 20 to 100 for better dev experience
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait 15 minutes and try again.' }
});
app.use('/api', limiter);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
};

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({ name, email, password });
    if (user) {
      res.status(201).json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({ _id: user._id, name: user.name, email: user.email, token: generateToken(user._id) });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/social-login', async (req, res) => {
  try {
    const { email, name, uid } = req.body;
    
    // Find user by email or create new one
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create user without password (social only)
      user = await User.create({ 
        name, 
        email, 
        password: Math.random().toString(36).slice(-12) // Random password for social users
      });
    }
    
    res.json({ 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      token: generateToken(user._id) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- EMAIL CAPTURE ---
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const existingEmail = await Email.findOne({ email });
    if (!existingEmail) {
      await Email.create({ email });
    }
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CONTACT FORM ---
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await Contact.create({ name, email, message });
    res.status(201).json({ message: 'Message received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-roadmap', protect, async (req, res) => {
  try {
    const { currentSkills, targetRole, hoursPerWeek, resourcePreference, includeYouTube, language } = req.body;

    if (!currentSkills || !targetRole || !hoursPerWeek) {
      return res.status(400).json({ error: 'Missing required fields: currentSkills, targetRole, hoursPerWeek' });
    }

    if (typeof targetRole !== 'string' || targetRole.length > 200) {
      return res.status(400).json({ error: 'targetRole must be under 200 chars.' });
    }

    if (typeof currentSkills !== 'string' || currentSkills.length > 500) {
      return res.status(400).json({ error: 'currentSkills must be under 500 chars.' });
    }

    const parsedHours = Number(hoursPerWeek);
    if (isNaN(parsedHours) || parsedHours < 1 || parsedHours > 100) {
      return res.status(400).json({ error: 'hoursPerWeek must be 1–100.' });
    }

    const pref = resourcePreference || "mixed";
    const roadmap = await generateRoadmap(currentSkills, targetRole, hoursPerWeek, pref, includeYouTube, language);

    // Save to DB
    const savedRoadmap = await Roadmap.create({
      user: req.user._id,
      targetRole,
      currentSkills,
      hoursPerWeek: parsedHours,
      roadmapData: roadmap
    });

    res.json({ roadmap, id: savedRoadmap._id });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Failed to generate roadmap',
      details: error.message || 'Unknown error'
    });
  }
});

// --- GLOSSARY ROUTES (SEO/AEO) ---

// Get all glossary terms with pagination
app.get('/api/glossary', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category;

    const query = { published: true };
    if (category) query.category = category;

    const terms = await Glossary.find(query)
      .sort({ priority: -1, term: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Glossary.countDocuments(query);

    res.json({
      terms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Glossary Fetch Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch glossary terms from database',
      details: error.message 
    });
  }
});

// Get single glossary term by slug
app.get('/api/glossary/:slug', async (req, res) => {
  try {
    const term = await Glossary.findOne({ slug: req.params.slug, published: true });

    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    res.json(term);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search glossary terms
app.get('/api/glossary/search/:query', async (req, res) => {
  try {
    const searchQuery = req.params.query.trim();

    if (searchQuery.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = await Glossary.find({
      $text: { $search: searchQuery },
      published: true
    })
      .limit(10)
      .select({ term: 1, definition: 1, category: 1, slug: 1 });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get glossary terms by category
app.get('/api/glossary/category/:category', async (req, res) => {
  try {
    const terms = await Glossary.find({
      category: req.params.category,
      published: true
    })
      .sort({ priority: -1, term: 1 });

    res.json({ terms, count: terms.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
