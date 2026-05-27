/**
 * POST /api/chat
 * General-purpose admissions AI assistant with live Supabase access.
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../db/client.js';

const router = Router();

const COLS = 'id, full_name, email, program_applied, program_level, eligibility_status, ai_recommendation, ai_reasoning, decision, forms_complete, monthly_budget';

// ── Stats ──────────────────────────────────────────────────────────────────────
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

// ── All applicants (for "list all" requests) ───────────────────────────────────
async function getAllApplicants() {
  const { data } = await supabase
    .from('applicants')
    .select(COLS)
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

// ── Search by name ─────────────────────────────────────────────────────────────
async function searchByName(term) {
  const { data } = await supabase
    .from('applicants')
    .select(COLS)
    .ilike('full_name', `%${term}%`)
    .limit(10);
  return data ?? [];
}

// ── Search by email ────────────────────────────────────────────────────────────
async function searchByEmail(term) {
  const { data } = await supabase
    .from('applicants')
    .select(COLS)
    .ilike('email', `%${term}%`)
    .limit(10);
  return data ?? [];
}

// ── Search by program keyword (e.g. "Psychology", "Theology", "Ministry") ──────
async function searchByProgram(keyword) {
  const { data } = await supabase
    .from('applicants')
    .select(COLS)
    .ilike('program_applied', `%${keyword}%`)
    .limit(10);
  return data ?? [];
}

// ── Detect intent from the latest user message ─────────────────────────────────
function detectIntent(text) {
  const t = text.toLowerCase();
  return {
    wantsAll: /list\s+(all|every|applicants)|show\s+(all|every|applicants)|all\s+applicants|everyone|every\s+applicant/.test(t),
    wantsStats: /how\s+many|total|count|stat|overview|pending|approved|rejected|needs\s+review/.test(t),
    emails: text.match(/[\w.-]+@[\w.-]+\.\w+/g) ?? [],
    // Program keywords — things that sound like subjects/programs
    programKeywords: extractProgramKeywords(text),
    // Proper names (2+ title-cased words, not stop words)
    names: extractNames(text),
  };
}

const STOP_WORDS = new Set([
  'how','was','the','did','is','are','what','who','when','where','why','can',
  'does','has','have','their','this','that','show','find','tell','me','about',
  'my','your','our','its','been','they','them','then','than','will','would',
  'could','should','make','just','also','only','any','all','new','more','for',
  'and','but','not','with','from','into','onto','over','under','too','very',
  'list','every','everyone','applicant','applicants','application','applications',
  'know','of','an','wanted','study','there','want','i','a','to','in','at','by',
]);

function extractNames(text) {
  const names = [];
  const words = text.split(/\s+/);
  let buf = [];
  for (const word of words) {
    const clean = word.replace(/'s$/i, '').replace(/[^a-zA-Z]/g, '');
    const isTitle = clean.length > 1 && clean[0] === clean[0].toUpperCase() && clean[0] !== clean[0].toLowerCase();
    if (isTitle && !STOP_WORDS.has(clean.toLowerCase())) {
      buf.push(clean);
    } else {
      if (buf.length >= 2) names.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length >= 2) names.push(buf.join(' '));

  // Also catch single names after trigger words: "find Maria", "open John"
  const triggerMatch = text.match(/(?:find|show me|look up|open|check|who is)\s+([A-Za-z]{2,})/gi);
  if (triggerMatch) {
    for (const m of triggerMatch) {
      const name = m.replace(/^(find|show me|look up|open|check|who is)\s+/i, '').trim();
      if (!STOP_WORDS.has(name.toLowerCase())) names.push(name);
    }
  }

  return [...new Set(names)];
}

function extractProgramKeywords(text) {
  // Match subject-like words that commonly appear in program names
  const programTerms = [
    'theology','theological','ministry','divinity','biblical','bible','studies',
    'counseling','education','pastoral','leadership','psychology','christian',
    'doctorate','master','bachelor','associate','certificate','philosophy',
    'religious','church','missions','evangelism','worship','preaching',
  ];
  const lower = text.toLowerCase();
  return programTerms.filter(t => lower.includes(t));
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI not configured — GEMINI_API_KEY missing on server.' });
    }

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const intent = detectIntent(lastUserMsg);
    const contextParts = [];

    // Always include stats
    const stats = await getStats();
    if (stats) contextParts.push('LIVE DASHBOARD STATS:\n' + JSON.stringify(stats, null, 2));

    // "List all applicants"
    if (intent.wantsAll) {
      const all = await getAllApplicants();
      contextParts.push(`ALL APPLICANTS (${all.length} total):\n` + JSON.stringify(all, null, 2));
    } else {
      const found = [];

      // Search by email
      for (const email of intent.emails) {
        const r = await searchByEmail(email);
        found.push(...r);
      }

      // Search by name
      for (const name of intent.names) {
        const r = await searchByName(name);
        found.push(...r);
      }

      // Search by program keyword
      for (const kw of intent.programKeywords) {
        const r = await searchByProgram(kw);
        found.push(...r);
      }

      const unique = [...new Map(found.map(a => [a.id, a])).values()];
      if (unique.length > 0) {
        contextParts.push('MATCHING APPLICANTS:\n' + JSON.stringify(unique, null, 2));
      }
    }

    // Build conversation as flat text
    const history = messages
      .map(m => (m.role === 'user' ? 'User' : 'Assistant') + ': ' + m.content)
      .join('\n\n');

    const dataBlock = '\n\n--- LIVE DATA ---\n' + contextParts.join('\n\n') + '\n--- END LIVE DATA ---\n';

    const prompt = [
      'You are a helpful AI assistant for the LOGOS Christian University Admissions office.',
      '',
      'You help the admissions team with anything related to the dashboard and admissions process:',
      '- Looking up specific applicants by name or email',
      '- Listing all applicants or filtering by program, status, level, etc.',
      '- Reporting live stats (totals, needs review, approved, rejected, pending)',
      '- Explaining eligibility decisions and AI recommendations',
      '- Answering questions about programs and admissions requirements',
      '- Finding applicants interested in a subject (e.g. "who wanted to study theology?")',
      '',
      'Key concepts:',
      '- eligibility_status: eligible (auto-approved), ineligible (auto-rejected), needs_review (manual/AI review)',
      '- decision: pending, approved, rejected, info_requested',
      '- forms_complete = true means all 3 forms received',
      '- Program levels: certificate, associate, bachelors, masters, doctorate',
      '',
      'IMPORTANT RULES:',
      '- Only report data from LIVE DATA below — never fabricate names, emails, or numbers',
      '- When listing multiple applicants, format them as a clean readable list',
      '- When you identify a single specific applicant the user likely wants to open, end your reply with:',
      '  ACTION:{"type":"navigate","path":"/applicants/THEIR-UUID"}',
      '- Only include ACTION when there is exactly one clear applicant being discussed',
      dataBlock,
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
