/**
 * POST /api/chat
 * Admissions AI assistant using Gemini function calling.
 *
 * Gemini receives the full schema, decides what to query, calls tools,
 * gets live data from Supabase, then forms a natural language answer.
 * All tools are strictly READ-ONLY — no mutations allowed.
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../db/client.js';

const router = Router();

// ── Columns Gemini is allowed to read ─────────────────────────────────────────
const SAFE_COLS = new Set([
  'id', 'email', 'full_name', 'phone',
  'program_applied', 'program_level',
  'form1_submitted_at', 'form2_submitted_at', 'form3_submitted_at', 'forms_complete',
  'eligibility_status', 'ai_recommendation', 'ai_reasoning',
  'decision', 'decision_by', 'decision_at', 'decision_notes',
  'highest_education', 'monthly_budget',
  'submitted_transcripts', 'submitted_diploma', 'submitted_undergraduate_diploma',
  'ministerial_years_fulltime', 'ministerial_years_associated',
  'created_at', 'updated_at',
]);

// ── Tool: get_stats ────────────────────────────────────────────────────────────
async function toolGetStats() {
  const { data, error } = await supabase
    .from('applicants')
    .select('forms_complete, eligibility_status, decision');
  if (error) return { error: error.message };
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

// ── Tool: query_applicants ─────────────────────────────────────────────────────
async function toolQueryApplicants({ filters = [], select_columns, order_by, order_ascending = false, limit = 50 }) {
  // Build select — only allow known safe columns
  let selectStr = 'id, full_name, email, program_applied, program_level, eligibility_status, ai_recommendation, decision, forms_complete';
  if (select_columns) {
    const cols = select_columns.split(',').map(c => c.trim()).filter(c => SAFE_COLS.has(c));
    if (cols.length > 0) selectStr = cols.join(', ');
  }

  let q = supabase.from('applicants').select(selectStr);

  for (const f of (filters || [])) {
    const col = f.column?.trim();
    if (!col || !SAFE_COLS.has(col)) continue; // silently skip unsafe columns
    switch (f.operator) {
      case 'eq':       q = q.eq(col, f.value); break;
      case 'neq':      q = q.neq(col, f.value); break;
      case 'ilike':    q = q.ilike(col, f.value); break;
      case 'gte':      q = q.gte(col, f.value); break;
      case 'lte':      q = q.lte(col, f.value); break;
      case 'is_true':  q = q.eq(col, true); break;
      case 'is_false': q = q.eq(col, false); break;
      case 'not_null': q = q.not(col, 'is', null); break;
      case 'is_null':  q = q.is(col, null); break;
    }
  }

  if (order_by && SAFE_COLS.has(order_by.trim())) {
    q = q.order(order_by.trim(), { ascending: !!order_ascending });
  } else {
    q = q.order('created_at', { ascending: false });
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
  q = q.limit(safeLimit);

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { count: data.length, results: data };
}

// ── Tool: get_applicant_details ────────────────────────────────────────────────
async function toolGetApplicantDetails({ id }) {
  if (!id) return { error: 'id is required' };
  const { data: applicant, error } = await supabase
    .from('applicants').select('*').eq('id', id).single();
  if (error) return { error: error.message };
  const { data: forms } = await supabase
    .from('form_submissions')
    .select('form_number, submitted_at, raw_data')
    .eq('applicant_id', id)
    .order('form_number', { ascending: true });
  return { applicant, forms: forms ?? [] };
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────
async function dispatchTool(name, args) {
  switch (name) {
    case 'get_stats':             return toolGetStats();
    case 'query_applicants':      return toolQueryApplicants(args);
    case 'get_applicant_details': return toolGetApplicantDetails(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ── Gemini tool declarations ───────────────────────────────────────────────────
const TOOL_DECLARATIONS = [{
  functionDeclarations: [
    {
      name: 'get_stats',
      description: 'Returns live dashboard counts: total applicants, forms complete, needs review, eligible, ineligible, approved, rejected, pending decision.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'query_applicants',
      description: `Query the applicants table with flexible filters. Use this for ANY search: by name, email, program, level, status, decision, budget, education, ministry experience, or any combination. You decide the filters.

Available columns: id, email, full_name, phone, program_applied, program_level, forms_complete, eligibility_status, ai_recommendation, ai_reasoning, decision, decision_notes, highest_education, monthly_budget, submitted_transcripts, submitted_diploma, ministerial_years_fulltime, ministerial_years_associated, created_at.

Example program_level values: certificate, associate, bachelors, masters, doctorate
Example eligibility_status values: eligible, ineligible, needs_review
Example decision values: pending, approved, rejected, info_requested
Example highest_education values: high_school, associate, bachelor, masters, doctorate`,
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'array',
            description: 'Filter conditions. Leave empty to get all applicants.',
            items: {
              type: 'object',
              properties: {
                column:   { type: 'string', description: 'Column name from the list above' },
                operator: {
                  type: 'string',
                  enum: ['eq','neq','ilike','gte','lte','is_true','is_false','not_null','is_null'],
                  description: 'eq=equals, neq=not equals, ilike=contains (use %value% wildcards), gte/lte=numeric comparison, is_true/is_false for booleans, not_null/is_null for presence checks',
                },
                value: { type: 'string', description: 'Value to compare. For ilike use %keyword% for contains.' },
              },
              required: ['column', 'operator'],
            },
          },
          select_columns: { type: 'string', description: 'Comma-separated columns to return. Omit for default set.' },
          order_by:        { type: 'string', description: 'Column to sort results by' },
          order_ascending: { type: 'boolean', description: 'true = ascending, false = descending (default)' },
          limit:           { type: 'number', description: 'Max results, 1–100. Default 50.' },
        },
      },
    },
    {
      name: 'get_applicant_details',
      description: 'Get full profile + all form submission data for one applicant by UUID. Use when you need deep detail on a specific person.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Applicant UUID' },
        },
        required: ['id'],
      },
    },
  ],
}];

// ── System instruction ─────────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `You are a helpful, intelligent AI assistant for the LOGOS Christian University Admissions office.

You have READ-ONLY access to the admissions database via the tools provided. You CANNOT and MUST NOT modify, delete, or create any records. If asked to do so, politely decline.

You help the admissions team with anything they need:
- Finding applicants by any criteria (name, email, program, status, budget, education, experience, etc.)
- Listing, filtering, and summarizing applicant data
- Explaining eligibility decisions, AI recommendations, and what they mean
- Dashboard stats and counts
- Answering questions about the admissions process and program requirements
- Anything else the team needs — think creatively with the tools available

When you're not sure what data to fetch, make a reasonable attempt with the tools. You can call multiple tools in one turn if needed.

NAVIGATION: When you identify a single specific applicant the user likely wants to open, end your reply with:
ACTION:{"type":"navigate","path":"/applicants/THEIR-UUID"}
Only include ACTION for a single clear applicant, not for lists.

TONE: Professional, concise, helpful. Format lists clearly. Never fabricate data.`;

// ── Route ──────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required.' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI not configured — GEMINI_API_KEY missing.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: TOOL_DECLARATIONS,
    });

    // Build Gemini-format history (must start with 'user', alternate user/model)
    // Filter out the opening assistant greeting and ensure proper alternation
    const geminiHistory = [];
    let lastRole = null;
    for (const msg of messages.slice(0, -1)) {
      const role = msg.role === 'user' ? 'user' : 'model';
      if (role === lastRole) continue; // skip consecutive same-role messages
      geminiHistory.push({ role, parts: [{ text: msg.content }] });
      lastRole = role;
    }
    // Ensure history starts with user turn
    while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
      geminiHistory.shift();
    }

    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const chat = model.startChat({ history: geminiHistory });

    // ── Agentic loop: let Gemini call tools until it gives a text response ──────
    let response = await chat.sendMessage(lastUserMsg);
    let rawReply = '';
    let action = null;
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      // Check if Gemini wants to call functions
      const functionCalls = parts.filter(p => p.functionCall);
      if (functionCalls.length === 0) {
        // No more tool calls — collect the text response
        rawReply = parts.filter(p => p.text).map(p => p.text).join('').trim();
        break;
      }

      // Execute all requested tool calls
      const toolResults = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        console.log(`[chat] Tool call: ${name}`, JSON.stringify(args).substring(0, 200));
        const result = await dispatchTool(name, args || {});
        toolResults.push({
          functionResponse: { name, response: result },
        });
      }

      // Send tool results back to Gemini
      response = await chat.sendMessage(toolResults);
    }

    // Parse optional ACTION block from reply
    const actionMatch = rawReply.match(/ACTION:(\{[^}]+\})\s*$/);
    if (actionMatch) {
      try { action = JSON.parse(actionMatch[1]); } catch { /* ignore */ }
      rawReply = rawReply.replace(/ACTION:\{[^}]+\}\s*$/, '').trim();
    }

    if (!rawReply) rawReply = 'I was unable to generate a response. Please try again.';

    return res.json({ reply: rawReply, action });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return res.status(500).json({ error: 'AI chat failed: ' + (err.message || 'unknown error') });
  }
});

export default router;
