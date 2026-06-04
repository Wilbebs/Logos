#!/usr/bin/env bash
# tests/realistic-tests.sh
# Realistic end-to-end webhook tests — detailed form submissions modeled on
# real MachForm payloads (Carlos Beron profile, June 2026).
#
# Run from workspace root:  bash tests/realistic-tests.sh
#
# IMPORTANT: DesiredProgramProramaDeseado must be the EXACT display_name from
# programs.json so eligibility.js exactMatch=true. Exact names used:
#   "Certificado en Estudios Bíblicos"
#   "Associate of Biblical Studies"
#   "Bachelor of Theological Studies"
#   "Master of Divinity (M.Div)"
#   "Doctor of Ministry (D.Min)"
#   "Doctor of Religious Philosophy (Ph.D)"

API="${LOGOS_API_URL:-http://localhost:8080/api}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
PASS=0; FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

pass()  { echo -e "  ${GREEN}✓ PASS${NC}  $1"; ((PASS++)); }
fail()  { echo -e "  ${RED}✗ FAIL${NC}  $1"; ((FAIL++)); }
info()  { echo -e "  ${YELLOW}→${NC}  $1"; }
title() { echo -e "\n${CYAN}── $1 ──${NC}"; }

# ── HTTP helpers ──────────────────────────────────────────────────────────────

post_json() {
  local url="$1" body="$2"
  curl -s -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Secret: ${WEBHOOK_SECRET:-logos-webhook-2026}" \
    -d "$body"
}

# Submit Form 2 (pastoral rec) and Form 3 (ministerial) for an applicant.
# All real fields from the MachForm payloads are included.
submit_f2() {
  local email="$1" pastor_name="$2" church_name="$3" denomination="$4" church_addr="$5" comment="$6"
  post_json "$API/webhook/machform/2" "{
    \"email\": \"$email\",
    \"Nombre\": \"$(echo $email | cut -d@ -f1)\",
    \"NombreDelPastor\": \"$pastor_name\",
    \"NombreDeLaIglesia\": \"$church_name\",
    \"DireccionDeLaIglesia\": \"$church_addr\",
    \"DenominacionPertenece\": \"$denomination\",
    \"CuantoTiempoHaConocidoAlAplicante\": \"5 años\",
    \"CuanBienConoceAlAplicante\": \"Extremadamente bien\",
    \"EsMiembroDesuIglesia\": \"Sí\",
    \"NivelDeParticipacion\": \"Buen participante\",
    \"RecomendariaAEstaPersona\": \"Sí\",
    \"ComentariosDelPastor\": \"$comment\"
  }"
}

submit_f3() {
  local email="$1" church="$2" pastor="$3" role="$4" years_attending="$5" ft="$6" assoc="$7" profession="$8" testimony="$9"
  post_json "$API/webhook/machform/3" "{
    \"email\": \"$email\",
    \"NombreDeLaIglesia\": \"$church\",
    \"NombreDelPastor\": \"$pastor\",
    \"EsUsted\": \"$role\",
    \"HaceCuantosAnosQueAsisteALaIglesia\": \"$years_attending\",
    \"AQueDenominacionPertenece\": \"Evangelica\",
    \"ApoyaALaIglesiaFinancieramente\": \"Sí - Diezmo y Ofrenda\",
    \"CuantasVecesAsisteALaIglesiaEnLaSemana\": \"3\",
    \"ministerial_years_fulltime\": $ft,
    \"ministerial_years_associated\": $assoc,
    \"ProfecionUOficioEspecifique\": \"$profession\",
    \"AreaDeDesempenoProfesional\": \"Empleado\",
    \"AnosDeExperiencia\": \"Más de 10 años\",
    \"ResumaSuTestimonio\": \"$testimony\",
    \"ListeLosDocumentosQueEnvia\": \"Diploma de escuela secundaria, transcripts\"
  }"
}

fetch_applicant() {
  local email="$1"
  curl -s "$API/applicants" | \
    jq -r --arg e "$email" '
      (if type == "array" then . else (.applicants // []) end)
      | map(select(.email == $e))
      | if length > 0 then .[0] else {} end'
}

assert_field() {
  local label="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | jq -r \
    --arg f "$field" \
    'if has($f) then (.[$f] | if type=="boolean" then if . then "True" else "False" end else tostring end) else "MISSING" end')
  if [[ "$actual" == "$expected" ]]; then
    pass "$label  ($field = '$expected')"
  else
    fail "$label  ($field expected='$expected' got='$actual')"
    echo "       → $(echo "$json" | jq -c '{eligibility_status,ai_recommendation,forms_complete}' 2>/dev/null)"
  fi
}

# ── Clear previous test data ──────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  LOGOS Admissions — Realistic Webhook Tests"
echo "  Backend: $API"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "── Clearing previous @logos.edu test applicants ──"
if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_KEY" ]]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "${SUPABASE_URL}/rest/v1/applicants?email=ilike.*%40logos.edu" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Prefer: return=minimal")
  [[ "$STATUS" == "204" || "$STATUS" == "200" ]] \
    && info "Cleared (HTTP $STATUS)" \
    || info "Clear returned HTTP $STATUS — check credentials"
else
  info "Skipping clear — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
fi

# =============================================================================
# ███  SECTION A — 5 NORMAL CASES (expected: ELIGIBLE)
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# A1 — Ana Milagros Pérez · Certificate CBS · Brooklyn NY
# Colombian origin · married · high school + HS diploma submitted · $25/mo
# Open enrollment → no doc/budget gate → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A1: Ana Pérez — Certificate CBS — ELIGIBLE"
EMAIL="test-a1-cert@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Ana Milagros\",
  \"LastNameApellido\": \"Pérez\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Mar 14, 1981\",
  \"BirthCountryPaísDeNacimiento\": \"Colombia\",
  \"StateOfBirthEstadoDeNacimiento\": \"Bogota DC\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"124 Harman St Apt 3A\",
  \"City\": \"Brooklyn\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"11221\",
  \"PhoneMobileCelular\": \"7188524410\",
  \"TelNumberNúmeroDeTeléfono\": \"7189001234\",
  \"PhoneHomeTeléfonoDeCasa\": \"7189001234\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Leader/Líder\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangélica Bethel\",
  \"DesdeCuándoAsisteALaIglesia\": \"8 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"120\",
  \"AreaOfinterestÁreaDeInteré\": \"Teología - Estudios Teológicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Certificate - Certificado\",
  \"DesiredProgramProramaDeseado\": \"Certificado en Estudios Bíblicos\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Nacional Bogotá\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Dec 15, 1999\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del título de Secundaria\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Recibí al Señor a los 17 años en Colombia. Emigré a EUA en 2005. Sirvo como líder de mujeres en mi iglesia desde hace 8 años.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Leonides Pérez\",
  \"NotasSiNecesitaEspacioOTienePregu\": \"\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Rev. Samuel Ortega" "Iglesia Evangélica Bethel" "Evangelica" "340 Wyckoff Ave Brooklyn NY 11237" "Ana lleva 8 años sirviendo fielmente. La recomiendo ampliamente.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangélica Bethel" "Rev. Samuel Ortega" "Líder" "8 años" 0 0 "Asistente Administrativa" "Recibí al Señor a los 17 años. Mi pasión es enseñar la Palabra a las mujeres de nuestra comunidad.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A1 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A1 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A2 — Carlos Eduardo Sánchez · Bachelor BTS · Bronx NY
# Puerto Rican · married · has associate degree + diploma + transcripts · $100/mo
# Education ≥ some_college, docs present → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A2: Carlos Sánchez — Bachelor BTS — ELIGIBLE"
EMAIL="test-a2-bach@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Carlos Eduardo\",
  \"LastNameApellido\": \"Sánchez\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Aug 3, 1975\",
  \"BirthCountryPaísDeNacimiento\": \"Puerto Rico\",
  \"StateOfBirthEstadoDeNacimiento\": \"San Juan\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"875 Longwood Ave Apt 5C\",
  \"City\": \"Bronx\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10459\",
  \"PhoneMobileCelular\": \"7184423391\",
  \"TelNumberNúmeroDeTeléfono\": \"7184423391\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Pentecostal\",
  \"MinistryMinisterio\": \"Diácono\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Pentecostal Cristo Rey\",
  \"DesdeCuándoAsisteALaIglesia\": \"15 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"200\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Superior Central de San Juan\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 20, 1993\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"Si, completé el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del Associate - Técnico\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Soy cristiano desde los 18 años. Sirvo como diácono en nuestra iglesia pentecostal desde hace 4 años y como maestro de escuela bíblica desde hace 6 años.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"María Sánchez\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Rafael Cruz" "Iglesia Pentecostal Cristo Rey" "Pentecostal" "1201 Southern Blvd Bronx NY 10459" "Carlos es un diácono comprometido con 15 años de trayectoria ministerial. Lo recomiendo sin reservas.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Pentecostal Cristo Rey" "Obispo Rafael Cruz" "Diácono" "15 años" 4 11 "Técnico de mantenimiento industrial" "Nací en San Juan PR. A los 18 conocí al Señor durante una campaña evangelística. Sirvo fielmente en el ministerio desde entonces.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A2 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A2 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A3 — María del Carmen Rosario · Associate ABS · Queens NY
# Cuban · married · high school + HS diploma + transcripts · $75/mo
# Open enrollment for associate → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A3: María Rosario — Associate ABS — ELIGIBLE"
EMAIL="test-a3-assoc@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"María del Carmen\",
  \"LastNameApellido\": \"Rosario\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Nov 28, 1968\",
  \"BirthCountryPaísDeNacimiento\": \"Cuba\",
  \"StateOfBirthEstadoDeNacimiento\": \"La Habana\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"65-40 Booth St Apt 2B\",
  \"City\": \"Rego Park\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"11374\",
  \"PhoneMobileCelular\": \"9294471820\",
  \"TelNumberNúmeroDeTeléfono\": \"9294471820\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Leader/Líder\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana de Queens\",
  \"DesdeCuándoAsisteALaIglesia\": \"6 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"80\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Bíblicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Associate - Tecnico Superior\",
  \"DesiredProgramProramaDeseado\": \"Associate of Biblical Studies\",
  \"BudgetsPresupuesto\": \"\$75\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Pre-Universitario La Habana\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 1986\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del título de Secundaria\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Llegué a Cristo en Cuba a los 20 años. Al emigrar a Estados Unidos encontré esta iglesia bautista donde he servido por 6 años enseñando la Palabra a niños y adultos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Roberto Rosario\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Ernesto Delgado" "Primera Iglesia Bautista Hispana de Queens" "Bautista" "89-15 Roosevelt Ave Queens NY 11372" "La hermana María tiene un hambre genuina por la Palabra de Dios. Es maestra fiel de escuela dominical desde hace 6 años.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana de Queens" "Pastor Ernesto Delgado" "Maestro" "6 años" 0 6 "Costurera independiente" "Llegué a Cristo en Cuba a los 20 años. Al emigrar encontré esta iglesia donde sirvo con alegría en la escuela dominical y el ministerio de mujeres.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A3 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A3 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A4 — Juan Pablo Ortega · Master M.Div · Miami FL
# Colombian (like Carlos Beron) · married · bachelor's degree + transcripts +
# undergraduate diploma submitted · $200/mo
# Education = bachelors ≥ required; docs complete → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A4: Juan Ortega — Master M.Div — ELIGIBLE"
EMAIL="test-a4-mdiv@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Juan Pablo\",
  \"LastNameApellido\": \"Ortega\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jan 12, 1979\",
  \"BirthCountryPaísDeNacimiento\": \"Colombia\",
  \"StateOfBirthEstadoDeNacimiento\": \"Medellín\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"3820 NW 7th St\",
  \"City\": \"Miami\",
  \"StateProvinceRegion\": \"FL\",
  \"PostalZipCode\": \"33126\",
  \"PhoneMobileCelular\": \"3054423391\",
  \"TelNumberNúmeroDeTeléfono\": \"3054423391\",
  \"DeWhatsapp\": \"+1 305 4423391\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Iglesia de Dios\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia de Dios Ministerio Hispano Miami\",
  \"DesdeCuándoAsisteALaIglesia\": \"12 años\",
  \"DesdeCuándoPastoreaEnLaIglesia\": \"5 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"150\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestría\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio San Ignacio Medellín\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Nov 25, 1997\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia de la Licenciatura\\n- Copia del título de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Conocí al Señor en Medellín a los 19 años. Llegué a Miami en 2002. Pastoreo la Iglesia de Dios Ministerio Hispano Miami desde 2019. Tengo mi licenciatura en Teología de la Universidad Bíblica Latinoamericana.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Elena Ortega\",
  \"EnQueAñoFueOrdenadoComoPastor\": \"2019\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Héctor Montoya" "Iglesia de Dios Ministerio Hispano Miami" "Iglesia de Dios" "3820 NW 7th St Miami FL 33126" "Juan pastora nuestra iglesia desde 2019 con excelente fruto espiritual. Lo recomiendo sin reservaciones para el M.Div.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia de Dios Ministerio Hispano Miami" "Obispo Héctor Montoya" "Pastor" "12 años" 5 7 "Pastor a tiempo completo" "Conocí al Señor en Colombia a los 19 años. Estudié teología y emigré a Miami donde planté esta congregación. Mi meta es profundizar mi formación pastoral con el M.Div.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A4 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A4 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A5 — Elena Patricia Vargas · Doctor of Ministry · Houston TX
# Venezuelan · married · master's + bachelor's + all docs · $200/mo
# Full academic path, 12yr FT ministry → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A5: Elena Vargas — D.Min — ELIGIBLE"
EMAIL="test-a5-dmin@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Elena Patricia\",
  \"LastNameApellido\": \"Vargas\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Apr 22, 1970\",
  \"BirthCountryPaísDeNacimiento\": \"Venezuela\",
  \"StateOfBirthEstadoDeNacimiento\": \"Caracas\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"9821 Bissonnet St Apt 104\",
  \"City\": \"Houston\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"77036\",
  \"PhoneMobileCelular\": \"7133029941\",
  \"TelNumberNúmeroDeTeléfono\": \"7133029941\",
  \"DeWhatsapp\": \"+1 713 3029941\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana de Houston\",
  \"DesdeCuándoAsisteALaIglesia\": \"20 años\",
  \"DesdeCuándoPastoreaEnLaIglesia\": \"12 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"350\",
  \"AreaOfinterestÁreaDeInteré\": \"Liderazgo & Coaching\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Andrés Bello Caracas\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 28, 1988\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"Si he completado estudios\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia de la Licenciatura\\n- Copia del título de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Recibí el llamado al ministerio en Venezuela a los 28 años. Fundé la Primera Iglesia Bautista Hispana de Houston en 2013. Completé mi maestría en Liderazgo Cristiano en 2018.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Ramón Vargas\",
  \"EnQueAñoFueOrdenadoComoPastor\": \"2012\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Dr. Antonio Reyes" "Primera Iglesia Bautista Hispana de Houston" "Bautista" "9821 Bissonnet St Houston TX 77036" "La Pastora Elena lleva 12 años de ministerio pastoral fructífero. Su preparación académica y espiritual la hacen candidata ideal para el D.Min.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana de Houston" "Dr. Antonio Reyes" "Pastor" "20 años" 12 8 "Pastora y profesora de teología a tiempo completo" "Fundé esta congregación en 2013 con 20 familias. Hoy somos 350 miembros. El D.Min me permitirá servir con mayor impacto a nivel regional.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A5 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A5 — eligibility_status" "$A" "eligibility_status" "eligible"


# =============================================================================
# ███  SECTION B — 10 EDGE CASES
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# B1 — Luis Alberto Mendoza · PhD without existing doctorate
# Has bachelor's only. Hard auto-reject: PhD requires existing Th.D. or D.Min.
# Bronx NY · Dominican Republic · married · elder 10yr
# EXPECTED: INELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "B1: Luis Mendoza — PhD no existing doctorate — INELIGIBLE"
EMAIL="test-b1-phd-nodoc@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Luis Alberto\",
  \"LastNameApellido\": \"Mendoza\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Sep 17, 1977\",
  \"BirthCountryPaísDeNacimiento\": \"Dom. Rep.\",
  \"StateOfBirthEstadoDeNacimiento\": \"Santiago\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"1640 University Ave Apt 3F\",
  \"City\": \"Bronx\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10453\",
  \"PhoneMobileCelular\": \"7184559302\",
  \"TelNumberNúmeroDeTeléfono\": \"7184559302\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangélica Emmanuel\",
  \"DesdeCuándoAsisteALaIglesia\": \"14 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"180\",
  \"AreaOfinterestÁreaDeInteré\": \"Teología - Estudios Teológicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Religious Philosophy (Ph.D)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Santiago Rodríguez\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 14, 1995\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia de la Licenciatura\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Llevo 14 años sirviendo al Señor y siento un llamado claro a la investigación teológica. Quiero hacer el PhD para enseñar a nivel universitario.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Carmen Mendoza\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Ramón Tejeda" "Iglesia Evangélica Emmanuel" "Evangelica" "1640 University Ave Bronx NY 10453" "Luis es un anciano serio y estudioso. Aunque no tiene doctorado, sugiero comenzar por el nivel de maestría.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangélica Emmanuel" "Pastor Ramón Tejeda" "Anciano" "14 años" 10 4 "Contador público" "Llevo 14 años sirviendo al Señor. Mi sueño es enseñar teología a nivel doctoral.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B1 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B1 — eligibility_status" "$A" "eligibility_status" "ineligible"

# ─────────────────────────────────────────────────────────────────────────────
# B2 — Carmen Rosa López · Master M.Div · $25/mo budget
# Has bachelor's + all docs. Budget = low tier. Master requires high tier.
# Manhattan NY · Mexican · married · Sunday school director
# EXPECTED: needs_review (financial flag)
# ─────────────────────────────────────────────────────────────────────────────
title "B2: Carmen López — Master \$25 budget — NEEDS_REVIEW (financial)"
EMAIL="test-b2-mast-budget@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Carmen Rosa\",
  \"LastNameApellido\": \"López\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jul 5, 1983\",
  \"BirthCountryPaísDeNacimiento\": \"Mexico\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ciudad de México\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"505 W 162nd St Apt 4D\",
  \"City\": \"New York\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10032\",
  \"PhoneMobileCelular\": \"2124889031\",
  \"TelNumberNúmeroDeTeléfono\": \"2124889031\",
  \"DeWhatsapp\": \"+1 212 4889031\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Presbiteriana\",
  \"MinistryMinisterio\": \"Leader/Líder\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Presbiteriana Washington Heights\",
  \"DesdeCuándoAsisteALaIglesia\": \"10 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"90\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestría\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Secundario Benito Juárez CDMX\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 18, 2001\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia de la Licenciatura\\n- Copia del título de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Soy cristiana desde los 15 años. Trabajo como maestra pública de día y sirvo en el ministerio los fines de semana. Mi situación económica es limitada pero tengo gran deseo de crecer.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Jorge López\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor James McAllister" "Iglesia Presbiteriana Washington Heights" "Presbiteriana" "505 W 162nd St New York NY 10032" "Carmen es directora de escuela dominical con excelente capacidad pedagógica. Su situación económica actual puede ser un reto para la maestría.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Presbiteriana Washington Heights" "Pastor James McAllister" "Maestro" "10 años" 0 10 "Maestra de escuela primaria" "Soy cristiana desde los 15 años. Mi pasión es la educación cristiana. Trabajo como maestra pública y sirvo en el ministerio los fines de semana.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B2 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B2 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B3 — José Miguel Martínez · Bachelor BTS · NO documents submitted
# Has bachelor's education but submitted NOTHING in doc checklist.
# Jersey City NJ · El Salvadoran · married · elder 6yr
# EXPECTED: needs_review (document flag — missing transcripts + diploma)
# ─────────────────────────────────────────────────────────────────────────────
title "B3: José Martínez — Bachelor, zero docs — NEEDS_REVIEW (documents)"
EMAIL="test-b3-bach-nodocs@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"José Miguel\",
  \"LastNameApellido\": \"Martínez\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Dec 1, 1980\",
  \"BirthCountryPaísDeNacimiento\": \"El Salvador\",
  \"StateOfBirthEstadoDeNacimiento\": \"San Salvador\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"280 Newark Ave Apt 2R\",
  \"City\": \"Jersey City\",
  \"StateProvinceRegion\": \"NJ\",
  \"PostalZipCode\": \"07302\",
  \"PhoneMobileCelular\": \"2018834402\",
  \"TelNumberNúmeroDeTeléfono\": \"2018834402\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Asamblea de Dios\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Asamblea de Dios Hispana de Jersey City\",
  \"DesdeCuándoAsisteALaIglesia\": \"11 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"95\",
  \"AreaOfinterestÁreaDeInteré\": \"Teología - Estudios Teológicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Nacional de El Salvador\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Oct 30, 1998\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"-\",
  \"DocumentosParaEvaluaciónSePuedenA\": \"-\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Vine a Cristo durante una crisis personal en 2008. Llevo 11 años en esta iglesia. Soy anciano desde 2018. Los documentos académicos los enviaré por correo esta semana.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Lucía Martínez\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Eliseo Fuentes" "Asamblea de Dios Hispana de Jersey City" "Asamblea de Dios" "280 Newark Ave Jersey City NJ 07302" "José es un anciano comprometido. Olvidó incluir sus documentos pero puedo confirmar que tiene su licenciatura de la Universidad de El Salvador.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Asamblea de Dios Hispana de Jersey City" "Pastor Eliseo Fuentes" "Anciano" "11 años" 0 11 "Electricista" "Vine a Cristo en 2008. Desde entonces me he dedicado al servicio de la iglesia como anciano y maestro de jóvenes.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B3 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B3 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B4 — Rosa Elena Guerrero · Master M.Div · high school only · 15yr FT ministry
# No college at all. Exceptional pastoral experience may qualify via AI review.
# Newark NJ · Guatemalan · widow · pastor of 75-person congregation
# EXPECTED: needs_review (below ed threshold, strong ministry — AI decides)
# ─────────────────────────────────────────────────────────────────────────────
title "B4: Rosa Guerrero — Master, HS only, 15yr FT ministry — NEEDS_REVIEW"
EMAIL="test-b4-mast-hs15yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Rosa Elena\",
  \"LastNameApellido\": \"Guerrero\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jan 12, 1965\",
  \"BirthCountryPaísDeNacimiento\": \"Guatemala\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ciudad de Guatemala\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Widow/Viudo(a)\",
  \"StreetAddress\": \"45 Orient Ave\",
  \"City\": \"Newark\",
  \"StateProvinceRegion\": \"NJ\",
  \"PostalZipCode\": \"07105\",
  \"PhoneMobileCelular\": \"9732218804\",
  \"TelNumberNúmeroDeTeléfono\": \"9732218804\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangélica Ríos de Agua Viva\",
  \"DesdeCuándoAsisteALaIglesia\": \"20 años\",
  \"DesdeCuándoPastoreaEnLaIglesia\": \"15 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"75\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestría\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Normal Central para Señoritas Guatemala\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Oct 22, 1983\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del título de Secundaria\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Fundé la Iglesia Ríos de Agua Viva en 2009 con 4 familias. Hoy somos 75 miembros activos. No tuve la oportunidad de ir a la universidad pero he estudiado la Biblia intensamente y completé 3 programas de capacitación ministerial.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Gerardo Fuentes\",
  \"EnQueAñoFueOrdenadoComoPastor\": \"2009\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Gerardo Fuentes" "Iglesia Evangélica Ríos de Agua Viva" "Evangelica" "45 Orient Ave Newark NJ 07105" "La pastora Rosa fundó su iglesia hace 15 años desde cero. No tiene estudios universitarios formales pero su conocimiento bíblico y fruto ministerial son extraordinarios. 75 almas bajo su cuidado.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangélica Ríos de Agua Viva" "Obispo Gerardo Fuentes" "Pastor" "20 años" 15 5 "Pastora a tiempo completo" "Fundé mi iglesia en 2009. He plantado 2 misiones desde entonces. Completé programa de formación pastoral 3 años, escuela de líderes 2 años, y entrenamiento para plantadores de iglesias 1 año.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B4 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B4 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B5 — Miguel Ángel Torres · D.Min · associate degree · 12yr FT ministry
# Has associate — below master's requirement. 12yr FT is edge-of-exception.
# Chicago IL · Puerto Rican · married · pastor of 90-person church
# EXPECTED: needs_review (associate + 12yr FT — AI review threshold)
# ─────────────────────────────────────────────────────────────────────────────
title "B5: Miguel Torres — D.Min, associate, 12yr FT — NEEDS_REVIEW"
EMAIL="test-b5-dmin-assoc12yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Miguel Ángel\",
  \"LastNameApellido\": \"Torres\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Mar 29, 1972\",
  \"BirthCountryPaísDeNacimiento\": \"Puerto Rico\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ponce\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"2230 S Millard Ave\",
  \"City\": \"Chicago\",
  \"StateProvinceRegion\": \"IL\",
  \"PostalZipCode\": \"60623\",
  \"PhoneMobileCelular\": \"7732441099\",
  \"TelNumberNúmeroDeTeléfono\": \"7732441099\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Pentecostal\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Pentecostal Fuente de Vida Chicago\",
  \"DesdeCuándoAsisteALaIglesia\": \"18 años\",
  \"DesdeCuándoPastoreaEnLaIglesia\": \"12 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"90\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Superior Central de Ponce\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 10, 1990\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"Si, completé el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del Associate - Técnico\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Nací en un hogar cristiano en Ponce PR. Comencé a pastorear a los 32 años. He plantado 2 misiones desde nuestra iglesia madre. Mi meta es completar el D.Min para enseñar en seminarios hispanos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Luz Torres\",
  \"EnQueAñoFueOrdenadoComoPastor\": \"2012\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Luis Cardona" "Iglesia Pentecostal Fuente de Vida Chicago" "Pentecostal" "2230 S Millard Ave Chicago IL 60623" "El pastor Miguel lleva 12 años al frente de su congregación. Aunque no tiene maestría, su experiencia pastoral y madurez espiritual superan a muchos con títulos académicos.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Pentecostal Fuente de Vida Chicago" "Obispo Luis Cardona" "Pastor" "18 años" 12 6 "Pastor y carpintero" "Soy pastor desde los 32 años. He plantado 2 misiones. Mi associate es de LOGOS. Quiero el D.Min para servir a nivel regional.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B5 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B5 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B6 — Isabel Fernanda Reyes · Master M.Div · has bachelor's but MISSING
#       undergraduate diploma in the checklist (only transcripts submitted)
# Graduate programs require BOTH transcripts AND undergrad diploma.
# Orlando FL · Dominican Republic · married · associate pastor 4yr
# EXPECTED: needs_review (document flag — undergrad diploma missing)
# ─────────────────────────────────────────────────────────────────────────────
title "B6: Isabel Reyes — Master, transcripts only, no undergrad diploma — NEEDS_REVIEW"
EMAIL="test-b6-mast-nodiploma@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Isabel Fernanda\",
  \"LastNameApellido\": \"Reyes\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jun 30, 1984\",
  \"BirthCountryPaísDeNacimiento\": \"Dom. Rep.\",
  \"StateOfBirthEstadoDeNacimiento\": \"Santo Domingo\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"7201 Arbor Oaks Dr Apt 201\",
  \"City\": \"Orlando\",
  \"StateProvinceRegion\": \"FL\",
  \"PostalZipCode\": \"32822\",
  \"PhoneMobileCelular\": \"4074819203\",
  \"TelNumberNúmeroDeTeléfono\": \"4074819203\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Centro Cristiano Alfa y Omega Orlando\",
  \"DesdeCuándoAsisteALaIglesia\": \"12 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"130\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestría\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Secundario Santo Domingo\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 25, 2002\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Me gradué de la PUCMM en Rep. Dom. con licenciatura en Comunicación. Emigré en 2011. Soy pastora asociada desde 2020. Aún no he podido legalizar el diploma para los Estados Unidos pero tengo los transcripts.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Lorenzo Abreu\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Lorenzo Abreu" "Centro Cristiano Alfa y Omega Orlando" "Evangelica" "7201 Arbor Oaks Dr Orlando FL 32822" "Isabel es pastora asociada desde 2020. Tiene su licenciatura de la PUCMM en Rep. Dom. pero aún no ha podido legalizar el diploma. Tiene los transcripts.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Centro Cristiano Alfa y Omega Orlando" "Pastor Lorenzo Abreu" "Pastor" "12 años" 4 8 "Comunicadora y pastora" "Estudié comunicación en la PUCMM y emigré a Orlando en 2011. Soy pastora asociada y creo que el M.Div me equipará para pastorear con mayor profundidad.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B6 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B6 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B7 — Francisco Javier Ruiz · D.Min · bachelor + 10yr associated ministry
# Has bachelor's (no master's). 10yr associated = exactly at the D.Min threshold.
# Dallas TX · Ecuadorian · married · elder 10yr
# EXPECTED: needs_review (bachelor + 10yr associated — right at edge)
# ─────────────────────────────────────────────────────────────────────────────
title "B7: Francisco Ruiz — D.Min, bachelor + 10yr associated — NEEDS_REVIEW"
EMAIL="test-b7-dmin-bach10yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Francisco Javier\",
  \"LastNameApellido\": \"Ruiz\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Nov 4, 1971\",
  \"BirthCountryPaísDeNacimiento\": \"Ecuador\",
  \"StateOfBirthEstadoDeNacimiento\": \"Quito\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"4520 Bryan St Apt 1A\",
  \"City\": \"Dallas\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"75204\",
  \"PhoneMobileCelular\": \"2147710038\",
  \"TelNumberNúmeroDeTeléfono\": \"2147710038\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Iglesia de Dios\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia de Dios Dallas Hispano\",
  \"DesdeCuándoAsisteALaIglesia\": \"16 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"220\",
  \"AreaOfinterestÁreaDeInteré\": \"Liderazgo & Coaching\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Nacional Mejía Quito\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jul 15, 1989\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia de la Licenciatura\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Vine a Cristo en 2001 en Ecuador. Emigré a Dallas en 2006. Soy anciano desde 2014. Tengo licenciatura en ingeniería civil. El D.Min me llamará a un ministerio más profundo a nivel regional.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"María Ruiz\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Pedro Navarro" "Iglesia de Dios Dallas Hispano" "Iglesia de Dios" "4520 Bryan St Dallas TX 75204" "Francisco lleva 10 años como anciano principal. No tiene maestría pero su preparación en la Palabra y madurez de carácter son sobresalientes.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia de Dios Dallas Hispano" "Pastor Pedro Navarro" "Anciano" "16 años" 0 10 "Ingeniero civil" "Vine a Cristo en Ecuador en 2001. Emigré a Dallas en 2006. Soy anciano desde 2014. Creo que el D.Min complementará mi formación profesional con profundidad teológica.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B7 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B7 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B8 — Teresa María Morales · Associate ABS · $25/mo budget
# Associate level requires medium budget ($50-$100). $25 = low tier only.
# Los Angeles CA · Honduran · widow · Sunday school teacher
# EXPECTED: needs_review (financial flag — associate requires $50+)
# ─────────────────────────────────────────────────────────────────────────────
title "B8: Teresa Morales — Associate \$25 budget — NEEDS_REVIEW (financial)"
EMAIL="test-b8-assoc-budget@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Teresa María\",
  \"LastNameApellido\": \"Morales\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Aug 20, 1961\",
  \"BirthCountryPaísDeNacimiento\": \"Honduras\",
  \"StateOfBirthEstadoDeNacimiento\": \"Tegucigalpa\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Widow/Viudo(a)\",
  \"StreetAddress\": \"821 S Bonnie Brae St\",
  \"City\": \"Los Angeles\",
  \"StateProvinceRegion\": \"CA\",
  \"PostalZipCode\": \"90057\",
  \"PhoneMobileCelular\": \"3232188847\",
  \"TelNumberNúmeroDeTeléfono\": \"3232188847\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Leader/Líder\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangélica Roca de Salvación LA\",
  \"DesdeCuándoAsisteALaIglesia\": \"17 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"60\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Bíblicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Associate - Tecnico Superior\",
  \"DesiredProgramProramaDeseado\": \"Associate of Biblical Studies\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Central Vicente Cáceres Tegucigalpa\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Nov 12, 1979\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller en Ciencias y Letras\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del título de Secundaria\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Enviudé en 2015 y el Señor fue mi fortaleza. Desde entonces me dediqué aún más al servicio de la iglesia. Vivo con presupuesto muy limitado pero quiero crecer en el conocimiento de la Palabra.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Julio Morales\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Julio Espinoza" "Iglesia Evangélica Roca de Salvación LA" "Evangelica" "821 S Bonnie Brae St Los Angeles CA 90057" "Teresa es maestra fiel de escuela dominical desde hace 9 años. Es viuda con ingreso limitado. Su deseo de crecer académicamente es genuino.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangélica Roca de Salvación LA" "Pastor Julio Espinoza" "Maestro" "17 años" 0 17 "Empleada doméstica" "Enviudé en 2015. Desde entonces me dediqué aún más al ministerio. Enseño escuela dominical desde hace 9 años y coordino el ministerio de cocina para indigentes.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B8 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B8 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B9 — Antonio Rafael Flores · D.Min · has EXISTING Th.D. · ZERO docs submitted
# Passes the PhD/doctorate gate (Doctorado = Si tengo). But graduate programs
# still require transcripts + undergraduate diploma in the checklist.
# San Antonio TX · Cuban · married · senior pastor 8yr
# EXPECTED: needs_review (document flag — has doctorate but no docs submitted)
# ─────────────────────────────────────────────────────────────────────────────
title "B9: Antonio Flores — D.Min has Th.D., zero docs — NEEDS_REVIEW (documents)"
EMAIL="test-b9-dmin-thd-nodocs@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Antonio Rafael\",
  \"LastNameApellido\": \"Flores\",
  \"NamePrefixPrefijoDeNombre\": \"Dr.\",
  \"GenderGénero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"May 18, 1963\",
  \"BirthCountryPaísDeNacimiento\": \"Cuba\",
  \"StateOfBirthEstadoDeNacimiento\": \"La Habana\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"7002 Blanco Rd\",
  \"City\": \"San Antonio\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"78216\",
  \"PhoneMobileCelular\": \"2108897761\",
  \"TelNumberNúmeroDeTeléfono\": \"2108897761\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana San Antonio\",
  \"DesdeCuándoAsisteALaIglesia\": \"22 años\",
  \"DesdeCuándoPastoreaEnLaIglesia\": \"8 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"280\",
  \"AreaOfinterestÁreaDeInteré\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Secundaria Básica La Habana\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Jun 10, 1981\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestría\": \"Si he completado estudios\",
  \"Doctorado\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"-\",
  \"DocumentosParaEvaluaciónSePuedenA\": \"-\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Emigré de Cuba en 1994. Completé mi Th.D. en 2010 en la Universidad Bautista Internacional. Sirvo como pastor principal desde 2016. Quiero el D.Min para enfatizar la práctica ministerial. Los documentos los enviaré por correo urgente.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Marco Hernández\",
  \"EnQueAñoFueOrdenadoComoPastor\": \"2016\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Dr. Marco Hernández" "Primera Iglesia Bautista Hispana San Antonio" "Bautista" "7002 Blanco Rd San Antonio TX 78216" "El Pastor Antonio tiene un Th.D. de la Universidad Bautista Internacional. Olvidó incluir sus documentos. Los tengo en archivo y puedo confirmar su autenticidad.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana San Antonio" "Dr. Marco Hernández" "Pastor" "22 años" 8 14 "Pastor y profesor de teología" "Emigré de Cuba en 1994. Completé mi Th.D. en 2010. Pastoreo esta iglesia desde 2016. Los documentos académicos los enviaré por correo esta semana.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B9 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B9 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B10 — Sofía Beatriz Ramírez · Bachelor BTS · has only associate · 10yr ministry
# No bachelor's degree yet. Has associate + 10yr associated ministry experience.
# Life-credit candidate: up to 30 credits for 12+ yr ministry (bachelor level).
# Philadelphia PA · Peruvian · married · deaconess + Bible teacher
# EXPECTED: needs_review (associate no bachelor + life credit candidate — AI)
# ─────────────────────────────────────────────────────────────────────────────
title "B10: Sofía Ramírez — Bachelor, associate only + 10yr ministry — NEEDS_REVIEW"
EMAIL="test-b10-bach-assoc10yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Sofía Beatriz\",
  \"LastNameApellido\": \"Ramírez\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGénero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Sep 6, 1978\",
  \"BirthCountryPaísDeNacimiento\": \"Peru\",
  \"StateOfBirthEstadoDeNacimiento\": \"Lima\",
  \"CountryOfCitizenshipPaísDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"2311 N 5th St\",
  \"City\": \"Philadelphia\",
  \"StateProvinceRegion\": \"PA\",
  \"PostalZipCode\": \"19133\",
  \"PhoneMobileCelular\": \"2155819034\",
  \"TelNumberNúmeroDeTeléfono\": \"2155819034\",
  \"DeWhatsapp\": \"+1 215 5819034\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQuéDenominaciónPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Diaconisa\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Cristiana Camino de Vida Philadelphia\",
  \"DesdeCuándoAsisteALaIglesia\": \"13 años\",
  \"CuántasPersonasAsistenALaIglesia\": \"110\",
  \"AreaOfinterestÁreaDeInteré\": \"Teología - Estudios Teológicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Santa Úrsula Lima\",
  \"GraduationYearAñoEnQueSeGraduó\": \"Nov 30, 1996\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller académico\",
  \"Associate\": \"Si, completé el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestría\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavía\",
  \"MarqueLosDocumentosQueEstáIncluyen\": \"- Copia del Associate - Técnico\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequeñoResumenDeSuVidaE\": \"Soy cristiana desde los 16 años en Lima Perú. Emigré a Philadelphia en 2005. He enseñado la Biblia por 10 años. Completé el Associate aquí en LOGOS y ahora siento que el Señor me llama a completar la licenciatura.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Félix Quispe\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Félix Quispe" "Iglesia Cristiana Camino de Vida Philadelphia" "Evangelica" "2311 N 5th St Philadelphia PA 19133" "Sofía es una de las maestras de Biblia más capaces que conozco. Ha enseñado la Escuela Bíblica por 10 años con gran dominio de la Escritura. Tiene Associate pero no Bachelor. Creo que califica perfectamente para la licenciatura con su experiencia ministerial.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Cristiana Camino de Vida Philadelphia" "Pastor Félix Quispe" "Diácono" "13 años" 0 10 "Maestra bilingüe en escuela cristiana" "Soy cristiana desde los 16 años en Lima. Emigré a Filadelfia en 2005. He enseñado la Biblia por 10 años ininterrumpidos. Completé el Associate en LOGOS y el Señor me llama a la licenciatura.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B10 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B10 — eligibility_status" "$A" "eligibility_status" "needs_review"


# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo ""
echo "  Expected:"
echo -e "  ${GREEN}ELIGIBLE${NC}      A1 Ana Pérez · A2 Carlos Sánchez · A3 María Rosario"
echo -e "                A4 Juan Ortega · A5 Elena Vargas"
echo -e "  ${RED}INELIGIBLE${NC}    B1 Luis Mendoza (PhD no existing doctorate)"
echo -e "  ${YELLOW}NEEDS_REVIEW${NC}  B2 Carmen López (Master \$25 budget)"
echo -e "                B3 José Martínez (Bachelor zero docs)"
echo -e "                B4 Rosa Guerrero (Master HS-only 15yr FT)"
echo -e "                B5 Miguel Torres (D.Min associate 12yr FT)"
echo -e "                B6 Isabel Reyes (Master missing undergrad diploma)"
echo -e "                B7 Francisco Ruiz (D.Min bachelor 10yr associated)"
echo -e "                B8 Teresa Morales (Associate \$25 budget)"
echo -e "                B9 Antonio Flores (D.Min Th.D. zero docs)"
echo -e "                B10 Sofía Ramírez (Bachelor associate 10yr ministry)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
