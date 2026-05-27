import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = readFileSync(
  path.join(__dirname, '../config/system-prompt.txt'),
  'utf-8'
);

export async function callAIReview(applicant, formData) {
  const raw = formData?.raw_data ?? {};

  // Prefer enriched applicant-record fields; fall back to raw form data
  const highest_education   = applicant.highest_education   || raw.highest_education   || 'Not provided';
  const min_ft              = applicant.ministerial_years_fulltime   ?? (parseInt(raw.ministerial_years_fulltime,  10) || 0);
  const min_assoc           = applicant.ministerial_years_associated ?? (parseInt(raw.ministerial_years_associated, 10) || 0);
  const has_doctorate       = applicant.highest_education === 'doctorate' || raw.has_existing_doctorate === 'true' || raw.has_existing_doctorate === true;

  // Verified document status (from the applicant record — set when Form 3 was processed)
  const transcripts_ok  = applicant.submitted_transcripts         === true ? '✓ Submitted' : '✗ Not submitted';
  const diploma_ok      = applicant.submitted_diploma             === true ? '✓ Submitted' : '✗ Not submitted';
  const undergrad_ok    = applicant.submitted_undergraduate_diploma === true ? '✓ Submitted' : '✗ Not submitted';

  // Rules-engine verdict — this is ground truth; do NOT contradict it
  const rulesStatus = applicant.eligibility_status || 'unknown';

  const userMessage = `Please review this admissions application:

=== PROGRAM ===
Program Applied: ${applicant.program_applied || 'Not specified'}
Program Level: ${applicant.program_level || 'Not specified'}

=== ACADEMIC BACKGROUND (verified from applicant record) ===
Highest Education: ${highest_education}
Has Existing Th.D. or D.Min.: ${has_doctorate ? 'Yes' : 'No'}
Ministerial Experience (full-time years): ${min_ft}
Ministerial Experience (associated/part-time years): ${min_assoc}

=== DOCUMENTS (verified — these are confirmed facts, do NOT question them) ===
Academic Transcripts: ${transcripts_ok}
Diploma: ${diploma_ok}
Undergraduate Diploma: ${undergrad_ok}

=== RULES ENGINE VERDICT (automated eligibility check already run) ===
Status: ${rulesStatus}
IMPORTANT: The rules engine already evaluated this application deterministically.
- If status is "eligible" → the applicant meets the academic requirements. Your job is to CONFIRM this or note any genuine soft concerns not covered by the rules. Do NOT re-question documents that are marked as submitted above.
- If status is "ineligible" → you should recommend "reject" unless there is a compelling exception case you can articulate clearly.
- If status is "needs_review" → this is why you were called. Assess the edge case and recommend "approve", "reject", or "escalate".

=== ADDITIONAL INFO ===
Additional Notes from Applicant: ${raw.additional_notes || 'None provided'}

Respond ONLY with a JSON object in this exact format:
{
  "recommendation": "approve" | "reject" | "escalate",
  "reasoning": "2-3 sentence plain language explanation",
  "confidence": 0.0 to 1.0,
  "flags": ["list of specific concerns, empty array if none"]
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemPrompt,
    });

    // temperature: 0 makes the model deterministic — same input always produces
    // the same recommendation. Without this, LLM randomness causes the decision
    // to flip between runs even when nothing about the applicant changed.
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0 },
    });
    const rawText = result.response.text().trim();

    let parsed;
    try {
      const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('[aiReview] Failed to parse Gemini response as JSON:', rawText, parseErr);
      return {
        recommendation: 'escalate',
        reasoning: 'AI returned an unparseable response. Manual review required.',
        confidence: 0,
        flags: ['AI_PARSE_ERROR'],
      };
    }

    return {
      recommendation: parsed.recommendation ?? 'escalate',
      reasoning: parsed.reasoning ?? 'No reasoning provided.',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (err) {
    console.error('[aiReview] Gemini review call failed:', err);
    return {
      recommendation: 'escalate',
      reasoning: 'AI review unavailable. Manual review required.',
      confidence: 0,
      flags: ['AI_ERROR'],
    };
  }
}
