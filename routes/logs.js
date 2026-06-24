import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const logsFile = path.join(__dirname, '..', 'logs', 'logs.json');

// GET /api/logs — return all audit logs from logs.json
router.get('/', async (req, res) => {
  try {
    const raw = await fs.readFile(logsFile, 'utf8');
    const logs = JSON.parse(raw);
    // Return newest first
    return res.json(logs.reverse());
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json([]);
    }
    return res.status(500).json({ error: err.message });
  }
});

export default router;
