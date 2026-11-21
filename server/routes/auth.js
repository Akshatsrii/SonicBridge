import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { isDbConnected, getMemoryStore } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sonicbridge-gamer-jwt-secret-key-2026';

// Helper: Token Generator
function generateToken(user) {
  return jwt.sign(
    { id: user.id || user._id, gamerTag: user.gamerTag, team: user.team },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ── 1. REGISTER PLAYER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { gamerTag, password, team = 'SOLO', avatar = '⚡' } = req.body;

    if (!gamerTag || gamerTag.trim().length < 2) {
      return res.status(400).json({ error: 'GamerTag must be at least 2 characters long' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const cleanTag = gamerTag.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    // MongoDB Mode
    if (isDbConnected()) {
      const existing = await User.findOne({ gamerTag: new RegExp(`^${cleanTag}$`, 'i') });
      if (existing) {
        return res.status(409).json({ error: 'GamerTag already taken. Please choose another!' });
      }

      const newUser = await User.create({
        gamerTag: cleanTag,
        password: hashedPassword,
        team: ['BLUE', 'RED', 'NEON', 'SOLO'].includes(team) ? team : 'SOLO',
        avatar,
        stats: { messagesSent: 0, filesTransferred: 0 },
      });

      const token = generateToken(newUser);
      return res.status(201).json({
        message: 'Player registered successfully!',
        token,
        player: newUser.toClientJSON(),
        storage: 'mongodb',
      });
    }

    // In-Memory Resilient Fallback Mode
    const memory = getMemoryStore();
    const existingKey = Array.from(memory.keys()).find((k) => k.toLowerCase() === cleanTag.toLowerCase());
    if (existingKey) {
      return res.status(409).json({ error: 'GamerTag already taken. Please choose another!' });
    }

    const memoryUser = {
      id: 'mem_' + Date.now(),
      gamerTag: cleanTag,
      password: hashedPassword,
      team: ['BLUE', 'RED', 'NEON', 'SOLO'].includes(team) ? team : 'SOLO',
      avatar,
      stats: { messagesSent: 0, filesTransferred: 0 },
      createdAt: new Date().toISOString(),
    };
    memory.set(cleanTag, memoryUser);

    const token = generateToken(memoryUser);
    const clientUser = { ...memoryUser };
    delete clientUser.password;

    return res.status(201).json({
      message: 'Player registered successfully! (Offline Zone Cache)',
      token,
      player: clientUser,
      storage: 'in-memory-cache',
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: 'Failed to register player: ' + err.message });
  }
});

// ── 2. LOGIN PLAYER ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { gamerTag, password } = req.body;

    if (!gamerTag || !password) {
      return res.status(400).json({ error: 'Please provide both GamerTag and password' });
    }

    const cleanTag = gamerTag.trim();

    // MongoDB Mode
    if (isDbConnected()) {
      const user = await User.findOne({ gamerTag: new RegExp(`^${cleanTag}$`, 'i') });
      if (!user) {
        return res.status(401).json({ error: 'Player not found with this GamerTag' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password. Try again!' });
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful!',
        token,
        player: user.toClientJSON(),
        storage: 'mongodb',
      });
    }

    // In-Memory Fallback Mode
    const memory = getMemoryStore();
    const existingKey = Array.from(memory.keys()).find((k) => k.toLowerCase() === cleanTag.toLowerCase());
    if (!existingKey) {
      return res.status(401).json({ error: 'Player not found in local zone session' });
    }

    const memoryUser = memory.get(existingKey);
    const isMatch = await bcrypt.compare(password, memoryUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Try again!' });
    }

    const token = generateToken(memoryUser);
    const clientUser = { ...memoryUser };
    delete clientUser.password;

    return res.json({
      message: 'Login successful! (Offline Zone Cache)',
      token,
      player: clientUser,
      storage: 'in-memory-cache',
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ── 3. GET CURRENT PLAYER PROFILE ─────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isDbConnected()) {
      const user = await User.findById(decoded.id);
      if (user) return res.json({ player: user.toClientJSON() });
    }

    const memory = getMemoryStore();
    const memUser = memory.get(decoded.gamerTag);
    if (memUser) {
      const clientUser = { ...memUser };
      delete clientUser.password;
      return res.json({ player: clientUser });
    }

    // Default decoded payload
    res.json({
      player: {
        id: decoded.id,
        gamerTag: decoded.gamerTag,
        team: decoded.team,
        avatar: '⚡',
        stats: { messagesSent: 0, filesTransferred: 0 },
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// ── 4. RECORD SENT MESSAGE STAT ──────────────────────────────────────
router.post('/stat', async (req, res) => {
  try {
    const { gamerTag, type = 'message' } = req.body;
    if (!gamerTag) return res.json({ ok: false });

    if (isDbConnected()) {
      const inc = type === 'file' ? { 'stats.filesTransferred': 1 } : { 'stats.messagesSent': 1 };
      await User.updateOne({ gamerTag }, { $inc: inc });
    } else {
      const memory = getMemoryStore();
      const user = memory.get(gamerTag);
      if (user) {
        if (type === 'file') user.stats.filesTransferred = (user.stats.filesTransferred || 0) + 1;
        else user.stats.messagesSent = (user.stats.messagesSent || 0) + 1;
      }
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

export default router;
