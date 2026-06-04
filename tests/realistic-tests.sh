#!/usr/bin/env bash
# tests/realistic-tests.sh
# Realistic end-to-end webhook tests — detailed form submissions modeled on
# real MachForm payloads (Carlos Beron profile, June 2026).
# UTF-8 locale required to prevent accented character corruption on Windows/macOS.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
#
# Run from workspace root:  bash tests/realistic-tests.sh
#
# IMPORTANT: DesiredProgramProramaDeseado must be the EXACT display_name from
# programs.json so eligibility.js exactMatch=true. Exact names used:
#   "Certificado en Estudios Biblicos"
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
    \"CuantoTiempoHaConocidoAlAplicante\": \"5 anos\",
    \"CuanBienConoceAlAplicante\": \"Extremadamente bien\",
    \"EsMiembroDesuIglesia\": \"Si\",
    \"NivelDeParticipacion\": \"Buen participante\",
    \"RecomendariaAEstaPersona\": \"Si\",
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
    \"ApoyaALaIglesiaFinancieramente\": \"Si - Diezmo y Ofrenda\",
    \"CuantasVecesAsisteALaIglesiaEnLaSemana\": \"3\",
    \"ministerial_years_fulltime\": $ft,
    \"ministerial_years_associated\": $assoc,
    \"ProfecionUOficioEspecifique\": \"$profession\",
    \"AreaDeDesempenoProfesional\": \"Empleado\",
    \"AnosDeExperiencia\": \"Mas de 10 anos\",
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
# A1 — Ana Milagros Perez · Certificate CBS · Brooklyn NY
# Colombian origin · married · high school + HS diploma submitted · $25/mo
# Open enrollment → no doc/budget gate → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A1: Ana Perez — Certificate CBS — ELIGIBLE"
EMAIL="test-a1-cert@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Ana Milagros\",
  \"LastNameApellido\": \"Perez\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Mar 14, 1981\",
  \"BirthCountryPaisDeNacimiento\": \"Colombia\",
  \"StateOfBirthEstadoDeNacimiento\": \"Bogota DC\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"124 Harman St Apt 3A\",
  \"City\": \"Brooklyn\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"11221\",
  \"PhoneMobileCelular\": \"7188524410\",
  \"TelNumberNumeroDeTelefono\": \"7189001234\",
  \"PhoneHomeTelefonoDeCasa\": \"7189001234\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Leader/Lider\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangelica Bethel\",
  \"DesdeCuandoAsisteALaIglesia\": \"8 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"120\",
  \"AreaOfinterestAreaDeIntere\": \"Teologia - Estudios Teologicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Certificate - Certificado\",
  \"DesiredProgramProramaDeseado\": \"Certificado en Estudios Biblicos\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Nacional Bogota\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Dec 15, 1999\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- diploma\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Recibi al Senor a los 17 anos en Colombia. Emigre a EUA en 2005. Sirvo como lider de mujeres en mi iglesia desde hace 8 anos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Leonides Perez\",
  \"NotasSiNecesitaEspacioOTienePregu\": \"\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Rev. Samuel Ortega" "Iglesia Evangelica Bethel" "Evangelica" "340 Wyckoff Ave Brooklyn NY 11237" "Ana lleva 8 anos sirviendo fielmente. La recomiendo ampliamente.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangelica Bethel" "Rev. Samuel Ortega" "Lider" "8 anos" 0 0 "Asistente Administrativa" "Recibi al Senor a los 17 anos. Mi pasion es ensenar la Palabra a las mujeres de nuestra comunidad.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A1 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A1 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A2 — Carlos Eduardo Sanchez · Bachelor BTS · Bronx NY
# Puerto Rican · married · has associate degree + diploma + transcripts · $100/mo
# Education ≥ some_college, docs present → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A2: Carlos Sanchez — Bachelor BTS — ELIGIBLE"
EMAIL="test-a2-bach@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Carlos Eduardo\",
  \"LastNameApellido\": \"Sanchez\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Aug 3, 1975\",
  \"BirthCountryPaisDeNacimiento\": \"Puerto Rico\",
  \"StateOfBirthEstadoDeNacimiento\": \"San Juan\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"875 Longwood Ave Apt 5C\",
  \"City\": \"Bronx\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10459\",
  \"PhoneMobileCelular\": \"7184423391\",
  \"TelNumberNumeroDeTelefono\": \"7184423391\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Pentecostal\",
  \"MinistryMinisterio\": \"Diacono\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Pentecostal Cristo Rey\",
  \"DesdeCuandoAsisteALaIglesia\": \"15 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"200\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Superior Central de San Juan\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 20, 1993\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"Si, complete el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- diploma\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Soy cristiano desde los 18 anos. Sirvo como diacono en nuestra iglesia pentecostal desde hace 4 anos y como maestro de escuela biblica desde hace 6 anos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Maria Sanchez\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Rafael Cruz" "Iglesia Pentecostal Cristo Rey" "Pentecostal" "1201 Southern Blvd Bronx NY 10459" "Carlos es un diacono comprometido con 15 anos de trayectoria ministerial. Lo recomiendo sin reservas.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Pentecostal Cristo Rey" "Obispo Rafael Cruz" "Diacono" "15 anos" 4 11 "Tecnico de mantenimiento industrial" "Naci en San Juan PR. A los 18 conoci al Senor durante una campana evangelistica. Sirvo fielmente en el ministerio desde entonces.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "A2 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "A2 — eligibility_status" "$A" "eligibility_status" "eligible"

# ─────────────────────────────────────────────────────────────────────────────
# A3 — Maria del Carmen Rosario · Associate ABS · Queens NY
# Cuban · married · high school + HS diploma + transcripts · $75/mo
# Open enrollment for associate → ELIGIBLE
# ─────────────────────────────────────────────────────────────────────────────
title "A3: Maria Rosario — Associate ABS — ELIGIBLE"
EMAIL="test-a3-assoc@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Maria del Carmen\",
  \"LastNameApellido\": \"Rosario\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Nov 28, 1968\",
  \"BirthCountryPaisDeNacimiento\": \"Cuba\",
  \"StateOfBirthEstadoDeNacimiento\": \"La Habana\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"65-40 Booth St Apt 2B\",
  \"City\": \"Rego Park\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"11374\",
  \"PhoneMobileCelular\": \"9294471820\",
  \"TelNumberNumeroDeTelefono\": \"9294471820\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Leader/Lider\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana de Queens\",
  \"DesdeCuandoAsisteALaIglesia\": \"6 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"80\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Biblicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Associate - Tecnico Superior\",
  \"DesiredProgramProramaDeseado\": \"Associate of Biblical Studies\",
  \"BudgetsPresupuesto\": \"\$75\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Pre-Universitario La Habana\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 1986\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- diploma\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Llegue a Cristo en Cuba a los 20 anos. Al emigrar a Estados Unidos encontre esta iglesia bautista donde he servido por 6 anos ensenando la Palabra a ninos y adultos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Roberto Rosario\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Ernesto Delgado" "Primera Iglesia Bautista Hispana de Queens" "Bautista" "89-15 Roosevelt Ave Queens NY 11372" "La hermana Maria tiene un hambre genuina por la Palabra de Dios. Es maestra fiel de escuela dominical desde hace 6 anos.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana de Queens" "Pastor Ernesto Delgado" "Maestro" "6 anos" 0 6 "Costurera independiente" "Llegue a Cristo en Cuba a los 20 anos. Al emigrar encontre esta iglesia donde sirvo con alegria en la escuela dominical y el ministerio de mujeres.")
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
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jan 12, 1979\",
  \"BirthCountryPaisDeNacimiento\": \"Colombia\",
  \"StateOfBirthEstadoDeNacimiento\": \"Medellin\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"3820 NW 7th St\",
  \"City\": \"Miami\",
  \"StateProvinceRegion\": \"FL\",
  \"PostalZipCode\": \"33126\",
  \"PhoneMobileCelular\": \"3054423391\",
  \"TelNumberNumeroDeTelefono\": \"3054423391\",
  \"DeWhatsapp\": \"+1 305 4423391\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Iglesia de Dios\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia de Dios Ministerio Hispano Miami\",
  \"DesdeCuandoAsisteALaIglesia\": \"12 anos\",
  \"DesdeCuandoPastoreaEnLaIglesia\": \"5 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"150\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestria\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio San Ignacio Medellin\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Nov 25, 1997\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia de la Licenciatura\\n- Copia del titulo de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Conoci al Senor en Medellin a los 19 anos. Llegue a Miami en 2002. Pastoreo la Iglesia de Dios Ministerio Hispano Miami desde 2019. Tengo mi licenciatura en Teologia de la Universidad Biblica Latinoamericana.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Elena Ortega\",
  \"EnQueAnoFueOrdenadoComoPastor\": \"2019\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Hector Montoya" "Iglesia de Dios Ministerio Hispano Miami" "Iglesia de Dios" "3820 NW 7th St Miami FL 33126" "Juan pastora nuestra iglesia desde 2019 con excelente fruto espiritual. Lo recomiendo sin reservaciones para el M.Div.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia de Dios Ministerio Hispano Miami" "Obispo Hector Montoya" "Pastor" "12 anos" 5 7 "Pastor a tiempo completo" "Conoci al Senor en Colombia a los 19 anos. Estudie teologia y emigre a Miami donde plante esta congregacion. Mi meta es profundizar mi formacion pastoral con el M.Div.")
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
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Apr 22, 1970\",
  \"BirthCountryPaisDeNacimiento\": \"Venezuela\",
  \"StateOfBirthEstadoDeNacimiento\": \"Caracas\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"9821 Bissonnet St Apt 104\",
  \"City\": \"Houston\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"77036\",
  \"PhoneMobileCelular\": \"7133029941\",
  \"TelNumberNumeroDeTelefono\": \"7133029941\",
  \"DeWhatsapp\": \"+1 713 3029941\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana de Houston\",
  \"DesdeCuandoAsisteALaIglesia\": \"20 anos\",
  \"DesdeCuandoPastoreaEnLaIglesia\": \"12 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"350\",
  \"AreaOfinterestAreaDeIntere\": \"Liderazgo & Coaching\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Andres Bello Caracas\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 28, 1988\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"Si he completado estudios\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia de la Licenciatura\\n- Copia del titulo de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Recibi el llamado al ministerio en Venezuela a los 28 anos. Funde la Primera Iglesia Bautista Hispana de Houston en 2013. Complete mi maestria en Liderazgo Cristiano en 2018.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Ramon Vargas\",
  \"EnQueAnoFueOrdenadoComoPastor\": \"2012\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Dr. Antonio Reyes" "Primera Iglesia Bautista Hispana de Houston" "Bautista" "9821 Bissonnet St Houston TX 77036" "La Pastora Elena lleva 12 anos de ministerio pastoral fructifero. Su preparacion academica y espiritual la hacen candidata ideal para el D.Min.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana de Houston" "Dr. Antonio Reyes" "Pastor" "20 anos" 12 8 "Pastora y profesora de teologia a tiempo completo" "Funde esta congregacion en 2013 con 20 familias. Hoy somos 350 miembros. El D.Min me permitira servir con mayor impacto a nivel regional.")
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
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Sep 17, 1977\",
  \"BirthCountryPaisDeNacimiento\": \"Dom. Rep.\",
  \"StateOfBirthEstadoDeNacimiento\": \"Santiago\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"1640 University Ave Apt 3F\",
  \"City\": \"Bronx\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10453\",
  \"PhoneMobileCelular\": \"7184559302\",
  \"TelNumberNumeroDeTelefono\": \"7184559302\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangelica Emmanuel\",
  \"DesdeCuandoAsisteALaIglesia\": \"14 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"180\",
  \"AreaOfinterestAreaDeIntere\": \"Teologia - Estudios Teologicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Religious Philosophy (Ph.D)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Santiago Rodriguez\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 14, 1995\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia de la Licenciatura\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Llevo 14 anos sirviendo al Senor y siento un llamado claro a la investigacion teologica. Quiero hacer el PhD para ensenar a nivel universitario.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Carmen Mendoza\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Ramon Tejeda" "Iglesia Evangelica Emmanuel" "Evangelica" "1640 University Ave Bronx NY 10453" "Luis es un anciano serio y estudioso. Aunque no tiene doctorado, sugiero comenzar por el nivel de maestria.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangelica Emmanuel" "Pastor Ramon Tejeda" "Anciano" "14 anos" 10 4 "Contador publico" "Llevo 14 anos sirviendo al Senor. Mi sueno es ensenar teologia a nivel doctoral.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B1 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B1 — eligibility_status" "$A" "eligibility_status" "ineligible"

# ─────────────────────────────────────────────────────────────────────────────
# B2 — Carmen Rosa Lopez · Master M.Div · $25/mo budget
# Has bachelor's + all docs. Budget = low tier. Master requires high tier.
# Manhattan NY · Mexican · married · Sunday school director
# EXPECTED: needs_review (financial flag)
# ─────────────────────────────────────────────────────────────────────────────
title "B2: Carmen Lopez — Master \$25 budget — NEEDS_REVIEW (financial)"
EMAIL="test-b2-mast-budget@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Carmen Rosa\",
  \"LastNameApellido\": \"Lopez\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jul 5, 1983\",
  \"BirthCountryPaisDeNacimiento\": \"Mexico\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ciudad de Mexico\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"505 W 162nd St Apt 4D\",
  \"City\": \"New York\",
  \"StateProvinceRegion\": \"NY\",
  \"PostalZipCode\": \"10032\",
  \"PhoneMobileCelular\": \"2124889031\",
  \"TelNumberNumeroDeTelefono\": \"2124889031\",
  \"DeWhatsapp\": \"+1 212 4889031\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Presbiteriana\",
  \"MinistryMinisterio\": \"Leader/Lider\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Presbiteriana Washington Heights\",
  \"DesdeCuandoAsisteALaIglesia\": \"10 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"90\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestria\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Secundario Benito Juarez CDMX\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 18, 2001\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia de la Licenciatura\\n- Copia del titulo de postgrado\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Soy cristiana desde los 15 anos. Trabajo como maestra publica de dia y sirvo en el ministerio los fines de semana. Mi situacion economica es limitada pero tengo gran deseo de crecer.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Jorge Lopez\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor James McAllister" "Iglesia Presbiteriana Washington Heights" "Presbiteriana" "505 W 162nd St New York NY 10032" "Carmen es directora de escuela dominical con excelente capacidad pedagogica. Su situacion economica actual puede ser un reto para la maestria.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Presbiteriana Washington Heights" "Pastor James McAllister" "Maestro" "10 anos" 0 10 "Maestra de escuela primaria" "Soy cristiana desde los 15 anos. Mi pasion es la educacion cristiana. Trabajo como maestra publica y sirvo en el ministerio los fines de semana.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B2 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B2 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B3 — Jose Miguel Martinez · Bachelor BTS · NO documents submitted
# Has bachelor's education but submitted NOTHING in doc checklist.
# Jersey City NJ · El Salvadoran · married · elder 6yr
# EXPECTED: needs_review (document flag — missing transcripts + diploma)
# ─────────────────────────────────────────────────────────────────────────────
title "B3: Jose Martinez — Bachelor, zero docs — NEEDS_REVIEW (documents)"
EMAIL="test-b3-bach-nodocs@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Jose Miguel\",
  \"LastNameApellido\": \"Martinez\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Dec 1, 1980\",
  \"BirthCountryPaisDeNacimiento\": \"El Salvador\",
  \"StateOfBirthEstadoDeNacimiento\": \"San Salvador\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"280 Newark Ave Apt 2R\",
  \"City\": \"Jersey City\",
  \"StateProvinceRegion\": \"NJ\",
  \"PostalZipCode\": \"07302\",
  \"PhoneMobileCelular\": \"2018834402\",
  \"TelNumberNumeroDeTelefono\": \"2018834402\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Asamblea de Dios\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Asamblea de Dios Hispana de Jersey City\",
  \"DesdeCuandoAsisteALaIglesia\": \"11 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"95\",
  \"AreaOfinterestAreaDeIntere\": \"Teologia - Estudios Teologicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Nacional de El Salvador\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Oct 30, 1998\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"-\",
  \"DocumentosParaEvaluacionSePuedenA\": \"-\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Vine a Cristo durante una crisis personal en 2008. Llevo 11 anos en esta iglesia. Soy anciano desde 2018. Los documentos academicos los enviare por correo esta semana.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Lucia Martinez\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Eliseo Fuentes" "Asamblea de Dios Hispana de Jersey City" "Asamblea de Dios" "280 Newark Ave Jersey City NJ 07302" "Jose es un anciano comprometido. Olvido incluir sus documentos pero puedo confirmar que tiene su licenciatura de la Universidad de El Salvador.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Asamblea de Dios Hispana de Jersey City" "Pastor Eliseo Fuentes" "Anciano" "11 anos" 0 11 "Electricista" "Vine a Cristo en 2008. Desde entonces me he dedicado al servicio de la iglesia como anciano y maestro de jovenes.")
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
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jan 12, 1965\",
  \"BirthCountryPaisDeNacimiento\": \"Guatemala\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ciudad de Guatemala\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Widow/Viudo(a)\",
  \"StreetAddress\": \"45 Orient Ave\",
  \"City\": \"Newark\",
  \"StateProvinceRegion\": \"NJ\",
  \"PostalZipCode\": \"07105\",
  \"PhoneMobileCelular\": \"9732218804\",
  \"TelNumberNumeroDeTelefono\": \"9732218804\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangelica Rios de Agua Viva\",
  \"DesdeCuandoAsisteALaIglesia\": \"20 anos\",
  \"DesdeCuandoPastoreaEnLaIglesia\": \"15 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"75\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestria\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Normal Central para Senoritas Guatemala\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Oct 22, 1983\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia del titulo de Secundaria\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Funde la Iglesia Rios de Agua Viva en 2009 con 4 familias. Hoy somos 75 miembros activos. No tuve la oportunidad de ir a la universidad pero he estudiado la Biblia intensamente y complete 3 programas de capacitacion ministerial.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Gerardo Fuentes\",
  \"EnQueAnoFueOrdenadoComoPastor\": \"2009\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Gerardo Fuentes" "Iglesia Evangelica Rios de Agua Viva" "Evangelica" "45 Orient Ave Newark NJ 07105" "La pastora Rosa fundo su iglesia hace 15 anos desde cero. No tiene estudios universitarios formales pero su conocimiento biblico y fruto ministerial son extraordinarios. 75 almas bajo su cuidado.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangelica Rios de Agua Viva" "Obispo Gerardo Fuentes" "Pastor" "20 anos" 15 5 "Pastora a tiempo completo" "Funde mi iglesia en 2009. He plantado 2 misiones desde entonces. Complete programa de formacion pastoral 3 anos, escuela de lideres 2 anos, y entrenamiento para plantadores de iglesias 1 ano.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B4 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B4 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B5 — Miguel Angel Torres · D.Min · associate degree · 12yr FT ministry
# Has associate — below master's requirement. 12yr FT is edge-of-exception.
# Chicago IL · Puerto Rican · married · pastor of 90-person church
# EXPECTED: needs_review (associate + 12yr FT — AI review threshold)
# ─────────────────────────────────────────────────────────────────────────────
title "B5: Miguel Torres — D.Min, associate, 12yr FT — NEEDS_REVIEW"
EMAIL="test-b5-dmin-assoc12yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Miguel Angel\",
  \"LastNameApellido\": \"Torres\",
  \"NamePrefixPrefijoDeNombre\": \"Mr.\",
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Mar 29, 1972\",
  \"BirthCountryPaisDeNacimiento\": \"Puerto Rico\",
  \"StateOfBirthEstadoDeNacimiento\": \"Ponce\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"2230 S Millard Ave\",
  \"City\": \"Chicago\",
  \"StateProvinceRegion\": \"IL\",
  \"PostalZipCode\": \"60623\",
  \"PhoneMobileCelular\": \"7732441099\",
  \"TelNumberNumeroDeTelefono\": \"7732441099\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Pentecostal\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Pentecostal Fuente de Vida Chicago\",
  \"DesdeCuandoAsisteALaIglesia\": \"18 anos\",
  \"DesdeCuandoPastoreaEnLaIglesia\": \"12 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"90\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Superior Central de Ponce\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 10, 1990\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"Si, complete el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia del Associate - Tecnico\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Naci en un hogar cristiano en Ponce PR. Comence a pastorear a los 32 anos. He plantado 2 misiones desde nuestra iglesia madre. Mi meta es completar el D.Min para ensenar en seminarios hispanos.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Luz Torres\",
  \"EnQueAnoFueOrdenadoComoPastor\": \"2012\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Obispo Luis Cardona" "Iglesia Pentecostal Fuente de Vida Chicago" "Pentecostal" "2230 S Millard Ave Chicago IL 60623" "El pastor Miguel lleva 12 anos al frente de su congregacion. Aunque no tiene maestria, su experiencia pastoral y madurez espiritual superan a muchos con titulos academicos.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Pentecostal Fuente de Vida Chicago" "Obispo Luis Cardona" "Pastor" "18 anos" 12 6 "Pastor y carpintero" "Soy pastor desde los 32 anos. He plantado 2 misiones. Mi associate es de LOGOS. Quiero el D.Min para servir a nivel regional.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B5 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B5 — eligibility_status" "$A" "eligibility_status" "ineligible"

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
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Jun 30, 1984\",
  \"BirthCountryPaisDeNacimiento\": \"Dom. Rep.\",
  \"StateOfBirthEstadoDeNacimiento\": \"Santo Domingo\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"7201 Arbor Oaks Dr Apt 201\",
  \"City\": \"Orlando\",
  \"StateProvinceRegion\": \"FL\",
  \"PostalZipCode\": \"32822\",
  \"PhoneMobileCelular\": \"4074819203\",
  \"TelNumberNumeroDeTelefono\": \"4074819203\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Centro Cristiano Alfa y Omega Orlando\",
  \"DesdeCuandoAsisteALaIglesia\": \"12 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"130\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Master - Maestria\",
  \"DesiredProgramProramaDeseado\": \"Master of Divinity (M.Div)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Liceo Secundario Santo Domingo\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 25, 2002\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Me gradue de la PUCMM en Rep. Dom. con licenciatura en Comunicacion. Emigre en 2011. Soy pastora asociada desde 2020. Aun no he podido legalizar el diploma para los Estados Unidos pero tengo los transcripts.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Lorenzo Abreu\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Lorenzo Abreu" "Centro Cristiano Alfa y Omega Orlando" "Evangelica" "7201 Arbor Oaks Dr Orlando FL 32822" "Isabel es pastora asociada desde 2020. Tiene su licenciatura de la PUCMM en Rep. Dom. pero aun no ha podido legalizar el diploma. Tiene los transcripts.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Centro Cristiano Alfa y Omega Orlando" "Pastor Lorenzo Abreu" "Pastor" "12 anos" 4 8 "Comunicadora y pastora" "Estudie comunicacion en la PUCMM y emigre a Orlando en 2011. Soy pastora asociada y creo que el M.Div me equipara para pastorear con mayor profundidad.")
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
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"Nov 4, 1971\",
  \"BirthCountryPaisDeNacimiento\": \"Ecuador\",
  \"StateOfBirthEstadoDeNacimiento\": \"Quito\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"4520 Bryan St Apt 1A\",
  \"City\": \"Dallas\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"75204\",
  \"PhoneMobileCelular\": \"2147710038\",
  \"TelNumberNumeroDeTelefono\": \"2147710038\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Iglesia de Dios\",
  \"MinistryMinisterio\": \"Anciano\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia de Dios Dallas Hispano\",
  \"DesdeCuandoAsisteALaIglesia\": \"16 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"220\",
  \"AreaOfinterestAreaDeIntere\": \"Liderazgo & Coaching\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Nacional Mejia Quito\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jul 15, 1989\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia de la Licenciatura\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Vine a Cristo en 2001 en Ecuador. Emigre a Dallas en 2006. Soy anciano desde 2014. Tengo licenciatura en ingenieria civil. El D.Min me llamara a un ministerio mas profundo a nivel regional.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Maria Ruiz\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Pedro Navarro" "Iglesia de Dios Dallas Hispano" "Iglesia de Dios" "4520 Bryan St Dallas TX 75204" "Francisco lleva 10 anos como anciano principal. No tiene maestria pero su preparacion en la Palabra y madurez de caracter son sobresalientes.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia de Dios Dallas Hispano" "Pastor Pedro Navarro" "Anciano" "16 anos" 0 10 "Ingeniero civil" "Vine a Cristo en Ecuador en 2001. Emigre a Dallas en 2006. Soy anciano desde 2014. Creo que el D.Min complementara mi formacion profesional con profundidad teologica.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B7 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B7 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B8 — Teresa Maria Morales · Associate ABS · $25/mo budget
# Associate level requires medium budget ($50-$100). $25 = low tier only.
# Los Angeles CA · Honduran · widow · Sunday school teacher
# EXPECTED: needs_review (financial flag — associate requires $50+)
# ─────────────────────────────────────────────────────────────────────────────
title "B8: Teresa Morales — Associate \$25 budget — NEEDS_REVIEW (financial)"
EMAIL="test-b8-assoc-budget@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Teresa Maria\",
  \"LastNameApellido\": \"Morales\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Aug 20, 1961\",
  \"BirthCountryPaisDeNacimiento\": \"Honduras\",
  \"StateOfBirthEstadoDeNacimiento\": \"Tegucigalpa\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Widow/Viudo(a)\",
  \"StreetAddress\": \"821 S Bonnie Brae St\",
  \"City\": \"Los Angeles\",
  \"StateProvinceRegion\": \"CA\",
  \"PostalZipCode\": \"90057\",
  \"PhoneMobileCelular\": \"3232188847\",
  \"TelNumberNumeroDeTelefono\": \"3232188847\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Leader/Lider\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Evangelica Roca de Salvacion LA\",
  \"DesdeCuandoAsisteALaIglesia\": \"17 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"60\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Biblicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Associate - Tecnico Superior\",
  \"DesiredProgramProramaDeseado\": \"Associate of Biblical Studies\",
  \"BudgetsPresupuesto\": \"\$25\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Instituto Central Vicente Caceres Tegucigalpa\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Nov 12, 1979\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller en Ciencias y Letras\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia del titulo de Secundaria\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Enviude en 2015 y el Senor fue mi fortaleza. Desde entonces me dedique aun mas al servicio de la iglesia. Vivo con presupuesto muy limitado pero quiero crecer en el conocimiento de la Palabra.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Julio Morales\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Julio Espinoza" "Iglesia Evangelica Roca de Salvacion LA" "Evangelica" "821 S Bonnie Brae St Los Angeles CA 90057" "Teresa es maestra fiel de escuela dominical desde hace 9 anos. Es viuda con ingreso limitado. Su deseo de crecer academicamente es genuino.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Evangelica Roca de Salvacion LA" "Pastor Julio Espinoza" "Maestro" "17 anos" 0 17 "Empleada domestica" "Enviude en 2015. Desde entonces me dedique aun mas al ministerio. Enseno escuela dominical desde hace 9 anos y coordino el ministerio de cocina para indigentes.")
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
  \"GenderGenero\": \"Male/Masculino\",
  \"DateOfBirthFechaDeNacimiento\": \"May 18, 1963\",
  \"BirthCountryPaisDeNacimiento\": \"Cuba\",
  \"StateOfBirthEstadoDeNacimiento\": \"La Habana\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"7002 Blanco Rd\",
  \"City\": \"San Antonio\",
  \"StateProvinceRegion\": \"TX\",
  \"PostalZipCode\": \"78216\",
  \"PhoneMobileCelular\": \"2108897761\",
  \"TelNumberNumeroDeTelefono\": \"2108897761\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Bautista\",
  \"MinistryMinisterio\": \"Pastor\",
  \"ChurchIglesiaMinistryMinisterio\": \"Primera Iglesia Bautista Hispana San Antonio\",
  \"DesdeCuandoAsisteALaIglesia\": \"22 anos\",
  \"DesdeCuandoPastoreaEnLaIglesia\": \"8 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"280\",
  \"AreaOfinterestAreaDeIntere\": \"Estudios Pastorales\",
  \"StudyLevelsNivelesDeEstudio\": \"Doctoral - Doctorado\",
  \"DesiredProgramProramaDeseado\": \"Doctor of Ministry (D.Min)\",
  \"BudgetsPresupuesto\": \"\$200\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Escuela Secundaria Basica La Habana\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Jun 10, 1981\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"No tengo estudios universitarios\",
  \"Licenciatura\": \"Si tengo\",
  \"Maestria\": \"Si he completado estudios\",
  \"Doctorado\": \"Si tengo\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"-\",
  \"DocumentosParaEvaluacionSePuedenA\": \"-\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Emigre de Cuba en 1994. Complete mi Th.D. en 2010 en la Universidad Bautista Internacional. Sirvo como pastor principal desde 2016. Quiero el D.Min para enfatizar la practica ministerial. Los documentos los enviare por correo urgente.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Marco Hernandez\",
  \"EnQueAnoFueOrdenadoComoPastor\": \"2016\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Dr. Marco Hernandez" "Primera Iglesia Bautista Hispana San Antonio" "Bautista" "7002 Blanco Rd San Antonio TX 78216" "El Pastor Antonio tiene un Th.D. de la Universidad Bautista Internacional. Olvido incluir sus documentos. Los tengo en archivo y puedo confirmar su autenticidad.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Primera Iglesia Bautista Hispana San Antonio" "Dr. Marco Hernandez" "Pastor" "22 anos" 8 14 "Pastor y profesor de teologia" "Emigre de Cuba en 1994. Complete mi Th.D. en 2010. Pastoreo esta iglesia desde 2016. Los documentos academicos los enviare por correo esta semana.")
info "F3 → $(echo "$R3" | jq -r '.applicant_id // .error // "ERR"')"
sleep 2
A=$(fetch_applicant "$EMAIL")
assert_field "B9 — forms_complete"     "$A" "forms_complete"     "True"
assert_field "B9 — eligibility_status" "$A" "eligibility_status" "needs_review"

# ─────────────────────────────────────────────────────────────────────────────
# B10 — Sofia Beatriz Ramirez · Bachelor BTS · has only associate · 10yr ministry
# No bachelor's degree yet. Has associate + 10yr associated ministry experience.
# Life-credit candidate: up to 30 credits for 12+ yr ministry (bachelor level).
# Philadelphia PA · Peruvian · married · deaconess + Bible teacher
# EXPECTED: needs_review (associate no bachelor + life credit candidate — AI)
# ─────────────────────────────────────────────────────────────────────────────
title "B10: Sofia Ramirez — Bachelor, associate only + 10yr ministry — NEEDS_REVIEW"
EMAIL="test-b10-bach-assoc10yr@logos.edu"

R=$(post_json "$API/webhook/machform/1" "{
  \"EmailICorreoElectronico\": \"$EMAIL\",
  \"FirstNmeNombre\": \"Sofia Beatriz\",
  \"LastNameApellido\": \"Ramirez\",
  \"NamePrefixPrefijoDeNombre\": \"Mrs.\",
  \"GenderGenero\": \"Female/Femenino\",
  \"DateOfBirthFechaDeNacimiento\": \"Sep 6, 1978\",
  \"BirthCountryPaisDeNacimiento\": \"Peru\",
  \"StateOfBirthEstadoDeNacimiento\": \"Lima\",
  \"CountryOfCitizenshipPaisDeOrigen\": \"United States\",
  \"MaritalStatusEstadoCivil\": \"Married / Casado(a)\",
  \"StreetAddress\": \"2311 N 5th St\",
  \"City\": \"Philadelphia\",
  \"StateProvinceRegion\": \"PA\",
  \"PostalZipCode\": \"19133\",
  \"PhoneMobileCelular\": \"2155819034\",
  \"TelNumberNumeroDeTelefono\": \"2155819034\",
  \"DeWhatsapp\": \"+1 215 5819034\",
  \"LanguagePreferredLenguajePreferido\": \"Spanish\",
  \"AQueDenominacionPertenece\": \"Evangelica\",
  \"MinistryMinisterio\": \"Diaconisa\",
  \"ChurchIglesiaMinistryMinisterio\": \"Iglesia Cristiana Camino de Vida Philadelphia\",
  \"DesdeCuandoAsisteALaIglesia\": \"13 anos\",
  \"CuantasPersonasAsistenALaIglesia\": \"110\",
  \"AreaOfinterestAreaDeIntere\": \"Teologia - Estudios Teologicos\",
  \"StudyLevelsNivelesDeEstudio\": \"Bachelor - Licenciatura\",
  \"DesiredProgramProramaDeseado\": \"Bachelor of Theological Studies\",
  \"BudgetsPresupuesto\": \"\$100\",
  \"CompletoSuEscuelaSecundaria\": \"SI\",
  \"NameOfHighSchoolNombreDeLaEscuela\": \"Colegio Santa Ursula Lima\",
  \"GraduationYearAnoEnQueSeGraduo\": \"Nov 30, 1996\",
  \"TypeOfDiplomaTipoDeDiploma\": \"Bachiller academico\",
  \"Associate\": \"Si, complete el estudio\",
  \"Licenciatura\": \"No tengo\",
  \"Maestria\": \"No tengo estudios de posgrado\",
  \"Doctorado\": \"No tengo un doctorado todavia\",
  \"MarqueLosDocumentosQueEstaIncluyen\": \"- Copia del Associate - Tecnico\\n- Transcripts - Registros oficiales de Notas de grado\",
  \"RealiceUnPequenoResumenDeSuVidaE\": \"Soy cristiana desde los 16 anos en Lima Peru. Emigre a Philadelphia en 2005. He ensenado la Biblia por 10 anos. Complete el Associate aqui en LOGOS y ahora siento que el Senor me llama a completar la licenciatura.\",
  \"NearestRelativeOrFriendFamiliarOAm\": \"Felix Quispe\"
}")
info "F1 → $(echo "$R" | jq -r '.applicant_id // .error // "ERR"')"
R2=$(submit_f2 "$EMAIL" "Pastor Felix Quispe" "Iglesia Cristiana Camino de Vida Philadelphia" "Evangelica" "2311 N 5th St Philadelphia PA 19133" "Sofia es una de las maestras de Biblia mas capaces que conozco. Ha ensenado la Escuela Biblica por 10 anos con gran dominio de la Escritura. Tiene Associate pero no Bachelor. Creo que califica perfectamente para la licenciatura con su experiencia ministerial.")
info "F2 → $(echo "$R2" | jq -r '.applicant_id // .error // "ERR"')"
R3=$(submit_f3 "$EMAIL" "Iglesia Cristiana Camino de Vida Philadelphia" "Pastor Felix Quispe" "Diacono" "13 anos" 0 10 "Maestra bilingue en escuela cristiana" "Soy cristiana desde los 16 anos en Lima. Emigre a Filadelfia en 2005. He ensenado la Biblia por 10 anos ininterrumpidos. Complete el Associate en LOGOS y el Senor me llama a la licenciatura.")
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
echo -e "  ${GREEN}ELIGIBLE${NC}      A1 Ana Perez · A2 Carlos Sanchez · A3 Maria Rosario"
echo -e "                A4 Juan Ortega · A5 Elena Vargas"
echo -e "  ${RED}INELIGIBLE${NC}    B1 Luis Mendoza (PhD no existing doctorate)"
echo -e "  ${YELLOW}NEEDS_REVIEW${NC}  B2 Carmen Lopez (Master \$25 budget)"
echo -e "                B3 Jose Martinez (Bachelor zero docs)"
echo -e "                B4 Rosa Guerrero (Master HS-only 15yr FT)"
echo -e "                B5 Miguel Torres (D.Min associate 12yr FT)"
echo -e "                B6 Isabel Reyes (Master missing undergrad diploma)"
echo -e "                B7 Francisco Ruiz (D.Min bachelor 10yr associated)"
echo -e "                B8 Teresa Morales (Associate \$25 budget)"
echo -e "                B9 Antonio Flores (D.Min Th.D. zero docs)"
echo -e "                B10 Sofia Ramirez (Bachelor associate 10yr ministry)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
