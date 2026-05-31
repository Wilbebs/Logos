#!/usr/bin/env bash
# tests/realistic-tests.sh
# Realistic end-to-end webhook tests for the LOGOS Admissions pipeline.
# Each scenario submits all 3 forms → triggers eligibility evaluation.
# Run from the workspace root:  bash tests/realistic-tests.sh
#
# IMPORTANT: DesiredProgramProramaDeseado must be the EXACT display_name from
# programs.json so that eligibility.js exactMatch=true (avoiding the inexact-
# match flag that forces confidence='low' → AI review → needs_review).
#
# Exact display names used:
#   cbs  → "Certificado en Estudios Bíblicos"
#   bts  → "Bachelor of Theological Studies"
#   mdiv → "Master of Divinity (M.Div)"
#   dmin → "Doctor of Ministry (D.Min)"
#   abs  → "Associate of Biblical Studies"

API="http://localhost:8080/api"
PASS=0
FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS${NC}  $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗ FAIL${NC}  $1"; ((FAIL++)); }
info() { echo -e "  ${YELLOW}→${NC}  $1"; }

# ── helpers ───────────────────────────────────────────────────────────────────

post_form() {
  local url="$1"; shift
  curl -s -X POST "$url" -H "Content-Type: application/json" "$@"
}

# Forms 2 & 3 recognise "email" (plain key); 3 FT + 2 associated ministerial years
submit_forms_2_and_3() {
  local email="$1"
  local r2 r3
  r2=$(post_form "$API/webhook/machform/2" -d "{\"email\":\"$email\"}")
  r3=$(post_form "$API/webhook/machform/3" \
    -d "{\"email\":\"$email\",\"ministerial_years_fulltime\":3,\"ministerial_years_associated\":2}")
  info "Form 2 → $(echo "$r2" | jq -r '.applicant_id // .error // "?"')"
  info "Form 3 → $(echo "$r3" | jq -r '.applicant_id // .error // "?"')"
}

fetch_applicant() {
  local email="$1"
  curl -s "$API/applicants" | \
    jq -r --arg e "$email" '
      (if type == "array" then . else (.applicants // []) end)
      | map(select(.email == $e))
      | if length > 0 then .[0] else {} end'
}

# Correctly handles boolean false (jq's // operator returns "" for false)
assert_field() {
  local label="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | jq -r \
    --arg f "$field" \
    'if has($f) then (.[$f] | if type == "boolean" then if . then "True" else "False" end else tostring end) else "MISSING" end')
  if [[ "$actual" == "$expected" ]]; then
    pass "$label  ($field = '$expected')"
  else
    fail "$label  ($field expected='$expected' got='$actual')"
    echo "       → $(echo "$json" | jq -c '{eligibility_status,ai_recommendation,forms_complete}' 2>/dev/null)"
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  LOGOS Admissions — Realistic Webhook Tests"
echo "═══════════════════════════════════════════════════════════════"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 1 — Institute / CBS: open enrollment → auto-approve
# Budget $25 = low tier; institute requires low ✓
# Program exact name → exactMatch=true; open enrollment → eligible, high ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 1: Institute / CBS — should be ELIGIBLE ──"
EMAIL="test-cert-cbs@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Maria\",
  \"LastNameApellido\": \"Santos\",
  \"PhoneMobileCelular\": \"555-0101\",
  \"StudyLevelsNivelesDeEstudio\": \"Certificate - Certificado\",
  \"DesiredProgramProramaDeseado\": \"Certificado en Estudios Bíblicos\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"diploma, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 1 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 1 — eligibility_status" "$A" "eligibility_status" "eligible"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 2 — Bachelor's / BTS: associate-level prior ed + docs + $100/mo
# Budget $100 = medium tier; bachelors requires medium ✓
# Education: associate → eduLevel 3 >= some_college 2 → auto-approve ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 2: Bachelor's / BTS — should be ELIGIBLE ──"
EMAIL="test-bach-bts@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Carlos\",
  \"LastNameApellido\": \"Rivera\",
  \"PhoneMobileCelular\": \"555-0102\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"Associate\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"diploma, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 2 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 2 — eligibility_status" "$A" "eligibility_status" "eligible"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 3 — Doctorate / D.Min without Master's → ineligible
# Education: bachelor's only (no master's); 3 FT ministerial = below 10yr threshold
# → belowMasters=true AND lowExperience=true → auto-reject ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 3: Doctorate / D.Min — no Master's → should be INELIGIBLE ──"
EMAIL="test-dmin-nomaster@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Ana\",
  \"LastNameApellido\": \"Mendez\",
  \"PhoneMobileCelular\": \"555-0103\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"Copia de la Licenciatura, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 3 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 3 — eligibility_status" "$A" "eligibility_status" "ineligible"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 4 — Master's / M.Div: has Bachelor's + all docs + $200/mo
# Budget $200 = high tier (not '25', '50', or '100'); masters requires high ✓
# Education: bachelors → eduLevel 4 >= bachelors 4 → auto-approve ✓
# Docs: "Copia de la Licenciatura" → submitted_undergraduate_diploma=true ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 4: Master's / M.Div — has Bachelor's → should be ELIGIBLE ──"
EMAIL="test-mdiv-ok@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Juan\",
  \"LastNameApellido\": \"Ortega\",
  \"PhoneMobileCelular\": \"555-0104\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestría\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"Licenciatura\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"Copia de la Licenciatura, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 4 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 4 — eligibility_status" "$A" "eligibility_status" "eligible"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 5 — Doctorate / D.Min with Master's + all docs + $200/mo
# Education: masters → eduLevel 5 >= masters 5 → auto-approve ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 5: Doctorate / D.Min — has Master's → should be ELIGIBLE ──"
EMAIL="test-dmin-ok@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Rosa\",
  \"LastNameApellido\": \"Vargas\",
  \"PhoneMobileCelular\": \"555-0105\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"Copia de la Licenciatura, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 5 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 5 — eligibility_status" "$A" "eligibility_status" "eligible"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 6 — Doctoral / D.Min budget $25/mo → needs_review (financial flag)
# Budget $25 = low tier; doctorate requires high → financial mismatch ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 6: Doctorate — budget \$25/mo → should flag NEEDS REVIEW ──"
EMAIL="test-dmin-budget@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Pedro\",
  \"LastNameApellido\": \"Flores\",
  \"PhoneMobileCelular\": \"555-0106\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"Copia de la Licenciatura, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 6 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 6 — eligibility_status" "$A" "eligibility_status" "needs_review"
assert_field "Scenario 6 — ai_recommendation"  "$A" "ai_recommendation"  "escalate"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 7 — Bachelor's / BTS missing transcripts → needs_review (doc flag)
# submitted_transcripts=false → document check fails → needs_review ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 7: Bachelor's — missing transcripts → should flag NEEDS REVIEW ──"
EMAIL="test-bts-nodocs@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Elena\",
  \"LastNameApellido\": \"Cruz\",
  \"PhoneMobileCelular\": \"555-0107\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"Associate\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"diploma\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 7 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 7 — eligibility_status" "$A" "eligibility_status" "needs_review"
assert_field "Scenario 7 — ai_recommendation"  "$A" "ai_recommendation"  "escalate"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 8 — Only Form 1 submitted → forms_complete stays false
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 8: Only Form 1 submitted → forms_complete should be false ──"
EMAIL="test-partial2@logos.edu"
post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Luis\",
  \"LastNameApellido\": \"Ramos\",
  \"StudyLevelsNivelesDeEstudio\": \"Certificate - Certificado\",
  \"DesiredProgramProramaDeseado\": \"Certificado en Estudios Bíblicos\",
  \"BudgetsPresupuesto\": \"\$25\"
}" > /dev/null
info "Form 1 only — forms 2 & 3 NOT submitted"
sleep 1

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 8 — forms_complete is false" "$A" "forms_complete" "False"


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 9 — Associate / ABS with HS diploma → eligible (open enrollment)
# Budget $75: not '25', '50', or '100' → high tier; associate needs medium → ✓
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "── Scenario 9: Associate / ABS — HS diploma → should be ELIGIBLE ──"
EMAIL="test-abs-ok@logos.edu"
R=$(post_form "$API/webhook/machform/1" -d "{
  \"email\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Sofia\",
  \"LastNameApellido\": \"Herrera\",
  \"PhoneMobileCelular\": \"555-0109\",
  \"StudyLevelsNivelesDeEstudio\": \"Associate - Técnico Superior\",
  \"DesiredProgramProramaDeseado\": \"Associate of Biblical Studies\",
  \"BudgetsPresupuesto\": \"\$75\",
  \"CompletoSuEscuelaSecundaria\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"diploma, Transcripts - Registros oficiales de Notas de grado\"
}")
info "Form 1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
submit_forms_2_and_3 "$EMAIL"
sleep 2

A=$(fetch_applicant "$EMAIL")
assert_field "Scenario 9 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "Scenario 9 — eligibility_status" "$A" "eligibility_status" "eligible"


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo -e "  Results: ${GREEN}${PASS} passed${NC} / ${RED}${FAIL} failed${NC} / ${TOTAL} total"
echo "═══════════════════════════════════════════════════════════════"
echo ""

[[ $FAIL -eq 0 ]]
