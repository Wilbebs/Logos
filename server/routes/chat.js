/**
 * POST /api/chat
 * Admissions AI assistant with read access to Supabase applicant data.
 *
 * Body: { messages: [{ role: 'user'|'assistant', content: string }, ...] }
 * Response: { reply: string, action?: { type: 'navigate', path: string } }
 *
 * The assistant can:
 *  - Query applicant counts and stats
 *  - Look up a specific applicant by name or email
 *  - Explain eligibility status
 *  - Return a navigation action so the frontend can deep-link to /applicants/:id
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../db/client.js';

const router = Router();

// System context for the chatbot
const SYSTEM_INSTRUCTION = `You are an AI admissions assistant for Logos Christian University.
You have read-only access to the applicant database via function calls provided to you.
You help admissions staff by:
- Looking up specific applicants by name or email
- Reporting statistics (total applicants, needs review counts, etc.)
- Explaining eligibility decisions in plain language
- Answering questions about program requirements

Tone: Professional, helpful, concise. Use plain language. Do NOT make up data — only report what the database returns.

When you have found an applicant and the user might want to navigate to their profile, include a JSON block at the very end of your reply in this exact format (nothing else after it):
ACTION:{"type":"navigate","path":"/applicants/APPLICANT_ID_HERE"}

Only include the ACTION block when it is clearly relevant (e.g., "show me X's application").`;

// ── Helper: fetch stats ────────────────────────────────────────────────────────
async function getStats() {
  const { data, error } = await supabase
    .from('applicants')
    .select('forms_complete, eligibility_status, decision');
  if (error) throw error;

  const stats = { total: data.length, forms_complete: 0, needs_review: 0, eligible: 0, ineligible: 0, approved: 0, rejected: 0, pending: 0 };
  for (const r of data) {
    if (r.forms_complete) stats.forms_complete++;
    if (r.eligibility_status === 'needs_review') stats.needs_review++;
    if (r.eligibility_status === 'eligible') stats.eligible++;
    if (r.eligibility_status === 'ineligible') stats.ineligible++;
    if (r.decision === 'approved') stats.approved++;
    if (r.decision === 'rejected') stats.rejected++;
    if (!r.decision || r.decision === 'pending') stats.pending++;
  }
  return stats;
}

// ── Helper: search applicant by name or email ─────────────────────────────────
async function searchApplicant(query) {
  const q = query.trim().toLowerCase();

  // Try email exact match first
  const { data: byEmail } = await supabase
    .from('applicants')
    .select('id, full_name, first_name, last_name, email, program_applied, program_level, eligibility_status, ai_recommendation, ai_reasoning, decision, forms_complete')
    .ilike('email', `%${q}%`)
    .limit(3);

  if (byEmail && byEmail.length > 0) return byEmail;

  // Try name search
  const { data: byName } = await supabase
    .from('applicants')
    .select('id, full_name, first_name, last_name, email, program_applied, program_level, eligibility_status, ai_recommendation, ai_reasoning, decision, forms_complete')
    .or(`full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(3);

  return byName ?? [];
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    // ── Pre-process: detect intents that need data ─────────────────────────
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const lowerMsg = lastUserMsg.toLowerCase();

    let dataContext = '';

    // Stats intent
    if (
      lowerMsg.includes('how many') ||
      lowerMsg.includes('total') ||
      lowerMsg.includes('count') ||
      lowerMsg.includes('stats') ||
      lowerMsg.includes('statistics') ||
      lowerMsg.includes('overview') ||
      lowerMsg.includes('needs review') ||
      lowerMsg.includes('approved') ||
      lowerMsg.includes('pending')
    ) {
      try {
        const stats = await getStats();
        dataContext += `\n\nCURRENT DATABASE STATS:\n${JSON.stringify(stats, null, 2)}`;
      } catch {
        dataContext += '\n\n[Could not fetch stats — database error]';
      }
    }

    // Applicant lookup intent
    const lookupMatch = lastUserMsg.match(
      /(?:show me|find|look up|search for|who is|tell me about|is|check)\s+([A-Za-z][\w\s'-]{1,40}?)(?:'s| application| eligible| qualified|$|\?|,)/i
    );
    if (lookupMatch || lowerMsg.includes('applicant') || lowerMsg.includes('@')) {
      // Extract name/email from the message
      const searchTerm = lookupMatch?.[1]?.trim() || lastUserMsg.replace(/[^a-zA-Z0-9@._\s-]/g, ' ').trim();
      if (searchTerm.length > 2) {
        try {
          const results = await searchApplicant(searchTerm);
          if (results.length > 0) {
            dataContext += `\n\nAPPLICANT SEARCH RESULTS for "${searchTerm}":\n${JSON.stringify(results, null, 2)}`;
          } else {
            dataContext += `\n\nNo applicants found matching "${searchTerm}".`;
          }
        } catch {
          dataContext += '\n\n[Could not search applicants — database error]';
        }
      }
    }

    // ── Build Gemini conversation ──────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Convert messages to Gemini format
    // Gemini uses 'user' and 'model' roles
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastContent = (messages[messages.length - 1]?.content || '') + (dataContext ? `\n\n[SYSTEM DATA]${dataContext}` : '');

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastContent);
    let rawReply = result.response.text().trim();

    // ── Parse optional ACTION block ────────────────────────────────────────
    let action = null;
    const actionMatch = rawReply.match(/ACTION:(\{.*?\})\s*$/s);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[1]);
      } catch { /* ignore parse errors */ }
      rawReply = rawReply.replace(/ACTION:\{.*?\}\s*$/s, '').trim();
    }

    return res.json({ reply: rawReply, action });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return res.status(500).json({ error: 'AI chat failed. Please try again.' });
  }
});

export default router;
