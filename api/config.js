// Tells the page which steps are switched on
import { kvEnabled } from '../lib/kv.js';

export default function handler(req, res) {
  res.json({
    cognism: Boolean(process.env.COGNISM_API_KEY),
    clay: Boolean(process.env.CLAY_WEBHOOK_URL && kvEnabled),
    cache: kvEnabled,
  });
}
