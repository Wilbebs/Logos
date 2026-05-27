/**
 * POST /api/chat
 * General-purpose admissions AI assistant with live Supabase access.
 *
 * Body: { messages: [{ role: 'user'|'assistant', content: string }, ...] }
 * Response: { reply: string, action?: { type: 'navigate', path: string } }
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../db/client.js';

const router = Router();

async function getStats() {
  const { data, error } = await supabase
    .from('applicants')
    .select('forms_complete, eligibility_status, decision');
  if (error) return null;
  const s = { total: data.length, forms_complete: 0, needs_review: 0, eligible: 0, ineligible: 0, approved: 0, rejected: 0, pending_decision: 0 };
  for (const r of data) {
    if (r.forms_complete) s.forms_complete++;
    if (r.eligibility_status === 'needs_review') s.needs_review++;
    if (r.eligibility_status === 'eligible') s.eligible++;
    if (r.eligibility_status === 'ineligible') s.ineligible++;
    if (r.decision === 'approved') s.approved++;
    if (r.decision === 'rejected') s.rejected++;
    if (!r.decision || r.decision === 'pending') s.pending_decision++;
  }
  return s;
}

async function searchApplicants(term) {
  if (!term || term.length < 2) return [];
  const cols = 'id, full_name, email, program_applied, program_level, eligibility_status, ai_recommendation, ai_reasoning, decision, forms_complete, monthly_budget';

  // Email — use exact ilike on the email column only (avoids @ breaking the or() parser)
  if (term.includes('@')) {
    const { data } = await supabase.from('applicants').select(cols).ilike('email', `%${term}%`).limit(5);
    return data ?? [];
  }

  // Name — only full_name and email columns exist; first_name/last_name do not
  const { data } = await supabase
    .from('applicants')
    .select(cols)
    .ilike('full_name', `%${term}%`)
    .limit(5);
  return data ?? [];
}

// Common words to ignore so we don't search for "How", "Was", "The", etc.
const STOP_WORDS = new Set([
  'how','was','the','did','is','are','what','who','when','where','why','can',
  'does','has','have','their','this','that','show','find','tell','me','about',
  'my','your','our','its','been','they','them','then','than','will','would',
  'could','should','make','just','also','only','any','all','new','more','for',
  'and','but','not','with','from','into','onto','over','under','too','very',
]);

function extractSearchTerms(text) {
  const terms = [];

  // Always grab emails — exact match
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) terms.push(...emails);

  // Grab sequences of Title-Cased words (names) — e.g. "Wilbert Hernandez"
  // Filter out common stop words so "How Was" doesn't become a search term
  const words = text.split(/\s+/);
  let nameBuffer = [];
  for (const word of words) {
    const clean = word.replace(/'s$/i, '').replace(/[^a-zA-Z]/g, ''); // strip possessive before cleaning
    if (clean.length > 1 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase() && !STOP_WORDS.has(clean.toLowerCase())) {
      nameBuffer.push(clean);
    } else {
      if (nameBuffer.length >= 2) terms.push(nameBuffer.join(' '));
      nameBuffer = [];
    }
  }
  if (nameBuffer.length >= 2) terms.push(nameBuffer.join(' '));

  // Also grab single capitalized words after explicit trigger verbs (e.g. "find Maria")
  const triggerPattern = /(?:show me|find|look up|search for|tell me about|who is|check|open|navigate to)\s+([A-Za-z][\w\s'-]{1,40}?)(?:\s*[;,?]|$)/gi;
  let m;
  while ((m = triggerPattern.exec(text)) !== null) {
    const candidate = m[1].trim();
    if (candidate.length > 2) terms.push(candidate);
  }

  return [...new Set(terms)];
}

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI not configured — GEMINI_API_KEY missing on server.' });
    }

    // Gather live data
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const contextParts = [];

    const stats = await getStats();
    if (stats) contextParts.push('LIVE DASHBOARD STATS:\n' + JSON.stringify(stats, null, 2));

    const terms = extractSearchTerms(lastUserMsg);
    const found = [];
    for (const t of terms) {
      const r = await searchApplicants(t);
      found.push(...r);
    }
    const unique = [...new Map(found.map(a => [a.id, a])).values()];
    if (unique.length > 0) {
      contextParts.push('MATCHING APPLICANTS:\n' + JSON.stringify(unique, null, 2));
    } else if (terms.length > 0) {
      contextParts.push('No applicants found matching: ' + terms.join(', '));
    }

    // Build conversation as flat text — avoids Gemini role alternation restrictions
    const history = messages
      .map(m => (m.role === 'user' ? 'User' : 'Assistant') + ': ' + m.content)
      .join('\n\n');

    const dataBlock = contextParts.length > 0
      ? '\n\n--- LIVE DATA (use this; do not fabricate) ---\n' + contextParts.join('\n\n') + '\n--- END LIVE DATA ---\n'
      : '';

    const prompt = [
      'You are a helpful AI assistant for the LOGOS Christian University Admissions office.',
      '',
      'You help the admissions team with anything related to the dashboard and admissions process:',
      '- Looking up applicants by name or email',
      '- Reporting live stats (totals, needs review, approved, rejected, pending, etc.)',
      '- Explaining eligibility decisions and AI recommendations',
      '- Clarifying program requirements and the admissions process',
      '- Navigating to an applicant profile (end reply with ACTION block)',
      '',
      'Key system concepts:',
      '- eligibility_status: eligible (auto-approved), ineligible (auto-rejected), needs_review (manual/AI review needed)',
      '- decision: pending, approved, rejected, info_requested',
      '- forms_complete = true means all 3 MachForm submissions received',
      '- Program levels: certificate, associate, bachelors, masters, doctorate',
      '- Financial flag: budget too low for program level → needs_review',
      '- Document flag: missing transcripts or diploma → needs_review',
      '- AI recommendation (approve/reject/escalate) only set for needs_review cases',
      dataBlock,
      'Only report data from LIVE DATA above. Never invent applicant names or numbers.',
      '',
      'To navigate to an applicant profile, end your reply with exactly:',
      'ACTION:{"type":"navigate","path":"/applicants/THEIR-UUID"}',
      '',
      '--- CONVERSATION ---',
      history,
    ].join('\n');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(prompt);
    let rawReply = result.response.text().trim();

    // Parse optional ACTION block
    let action = null;
    const actionMatch = rawReply.match(/ACTION:(\{[^}]+\})\s*$/);
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1]); } catch { /* ignore */ }
      rawReply = rawReply.replace(/ACTION:\{[^}]+\}\s*$/, '').trim();
    }

    return res.json({ reply: rawReply, action });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return res.status(500).json({ error: 'AI chat failed: ' + (err.message || 'unknown error') });
  }
});

export default router;
