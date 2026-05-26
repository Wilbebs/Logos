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
  const userMessage = `Please review this admissions application:

Program Applied: ${applicant.program_applied || 'Not specified'}
Program Level: ${applicant.program_level || 'Not specified'}
Prior Education (self-reported): ${formData?.raw_data?.highest_education || 'Not provided'}
Ministerial Experience (full-time years): ${formData?.raw_data?.ministerial_years_fulltime || '0'}
Ministerial Experience (associated years): ${formData?.raw_data?.ministerial_years_associated || '0'}
Has Existing Doctorate (Th.D. or D.Min.): ${formData?.raw_data?.has_existing_doctorate || 'false'}
Additional Notes: ${formData?.raw_data?.additional_notes || 'None provided'}

Respond ONLY with a JSON object in this exact format:
{
  "recommendation": "approve" | "reject" | "escalate",
  "reasoning": "2-3 sentence plain language explanation",
  "confidence": 0.0 to 1.0,
  "flags": ["list of specific concerns, empty array if none"]
}`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userMessage);
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
