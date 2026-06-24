import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const logsDir = path.join(__dirname, '..', 'logs');

// GET /api/logs — list all log files grouped by audit session
router.get('/', async (req, res) => {
  try {
    await fs.mkdir(logsDir, { recursive: true });
    const files = await fs.readdir(logsDir);

    if (files.length === 0) {
      return res.json({ message: 'No logs found yet.', sessions: [] });
    }

    // Group files by timestamp (each audit produces 3 files with same timestamp)
    const sessionsMap = {};
    for (const file of files) {
      // Extract timestamp from filename e.g. system_prompt_example_com_1782253123845.txt
      const match = file.match(/_(\d{13})\./);
      if (!match) continue;
      const timestamp = match[1];
      if (!sessionsMap[timestamp]) {
        sessionsMap[timestamp] = { timestamp, date: new Date(parseInt(timestamp)).toISOString(), files: [] };
      }
      sessionsMap[timestamp].files.push(file);
    }

    // Sort sessions newest first
    const sessions = Object.values(sessionsMap).sort((a, b) => b.timestamp - a.timestamp);
    return res.json({ total: sessions.length, sessions });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/:filename — get contents of a specific log file
router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    // Sanitize: only allow alphanumeric, underscores, dots, hyphens
    if (!/^[\w\-\.]+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(logsDir, filename);

    // Prevent path traversal
    if (!filePath.startsWith(logsDir)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const isJson = filename.endsWith('.json');

    return res.type(isJson ? 'json' : 'text').send(content);

  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.status(500).json({ error: err.message });
  }
});

export default router;
