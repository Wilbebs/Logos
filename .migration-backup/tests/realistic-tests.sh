#!/bin/bash
# =============================================================================
# LOGOS Admissions — Realistic Test Suite
# Run from Replit shell: bash tests/realistic-tests.sh
#
# 5 Normal cases (clear-cut eligible) + 10 Edge cases
# All applicants are modeled after real submission data (Marcos Nuñez profile)
# Uses @logostest.edu emails so they can be bulk-cleared without touching prod
#
# EXPECTED OUTCOMES are marked on each test:
#   ELIGIBLE         — passes all gates, auto-approved
#   INELIGIBLE       — fails a hard rule, auto-rejected
#   FINANCIAL FLAG   — budget too low for requested program
#   DOCUMENT FLAG    — missing required documents
#   NEEDS REVIEW     — edge case, triggers AI review
# =============================================================================

BASE_URL="${LOGOS_API_URL:-http://localhost:3001}"
SECRET="${WEBHOOK_SECRET:-logos-webhook-2026}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  LOGOS Admissions — Realistic Test Suite${NC}"
echo -e "${CYAN}  Backend: ${BASE_URL}${NC}"
echo -e "${CYAN}============================================================${NC}"

# =============================================================================
# STEP 0 — Clear previous realistic test data from Supabase
# =============================================================================
echo ""
echo -e "${YELLOW}[0/15] Clearing previous @logostest.edu test data...${NC}"

if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  CLEAR_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "${SUPABASE_URL}/rest/v1/applicants?email=ilike.*@logostest.edu" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Prefer: return=minimal")
  if [ "$CLEAR_RESULT" = "204" ] || [ "$CLEAR_RESULT" = "200" ]; then
    echo -e "${GREEN}  Cleared. (HTTP $CLEAR_RESULT)${NC}"
  else
    echo -e "${RED}  Warning: clear returned HTTP $CLEAR_RESULT — check Supabase credentials${NC}"
  fi
else
  echo -e "${YELLOW}  Skipping (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in env)${NC}"
  echo -e "${YELLOW}  To enable: export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...${NC}"
fi

# =============================================================================
# Helper — fires all 3 forms for one applicant, 500ms apart
# Usage: send_application "TEST NAME" "email" form1_args... "---" form2_args... "---" form3_args...
# We use a simpler approach: one function per form.
# =============================================================================

fire_form() {
  local form_num="$1"
  shift
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-Webhook-Secret: ${SECRET}" \
    "$@" \
    "${BASE_URL}/webhook/machform/${form_num}")
  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | head -n -1)
  if [ "$http_code" = "200" ]; then
    echo -e "    Form ${form_num}: ${GREEN}OK${NC} — ${body}"
  else
    echo -e "    Form ${form_num}: ${RED}FAIL (HTTP ${http_code})${NC} — ${body}"
  fi
  sleep 0.5
}

# =============================================================================
# ██████████████████████████████████████████████████████████████████████████
#  SECTION A — 5 NORMAL CASES (clear-cut eligible, no edge conditions)
# ██████████████████████████████████████████████████████████████████████████
# =============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  SECTION A — NORMAL CASES (Expected: ELIGIBLE)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# -----------------------------------------------------------------------------
# NORMAL 1 — Ana Milagros Pérez
# Bachelor of Theology. Has bachelor's degree + transcripts + diploma.
# Evangelical. Brooklyn, NY. Dominican Republic. Married. Lay leader 8 years.
# Budget: unrestricted. Documents: complete.
# EXPECTED: ELIGIBLE
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[A1] Ana Milagros Pérez — Bachelor of Theology — Expected: ELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Ana Milagros" \
  --data-urlencode "LastNameApellido=Pérez" \
  --data-urlencode "EmailICorreoElectronico=ana.perez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=7188524410" \
  --data-urlencode "TelNumberNumeroDetelefono=7189001234" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Mar 14, 1981" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Dom. Rep." \
  --data-urlencode "StateOfBirthEstadoDeNacimiento=Santiago" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=124 Harman St, Apt 3A" \
  --data-urlencode "City=Brooklyn" \
  --data-urlencode "State=NY" \
  --data-urlencode "PostalZipCode=11221" \
  --data-urlencode "NamePrefixPrefixoDeNombre=Mrs." \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Bachelor - Licenciatura" \
  --data-urlencode "DesiredProgramProramaDeseado=Bachelor of Theology (B.Th)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Teología - Estudios Teológicos" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Leader/Líder" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=8 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=120" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "NameOfHighSchoolNombreDeLaEscuela=Escuela Secundaria José Martí" \
  --data-urlencode "GraduationYearAñoEnQueSeGraduo=Jun 15, 1999" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" \
  --data-urlencode "Language=Spanish"

fire_form 2 \
  --data-urlencode "Nombre=Ana Milagros" \
  --data-urlencode "Apellido=Pérez" \
  --data-urlencode "CorreoElectronico=ana.perez@logostest.edu" \
  --data-urlencode "TelefonoCelular=7188524410" \
  --data-urlencode "NombreDelPastor=Rev. Samuel Ortega" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Bethel" \
  --data-urlencode "DireccionDeLaIglesia=340 Wyckoff Ave, Brooklyn NY 11237" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "CuantoTiempoHaConocidoAlAplicante=7 años" \
  --data-urlencode "CuanBienConoceAlAplicante=Extremadamente bien" \
  --data-urlencode "EsMiembroDesuIglesia=Sí" \
  --data-urlencode "NivelDeParticipacion=Buen participante" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Ana es una mujer de gran fe, comprometida con la Palabra de Dios. Lleva 8 años sirviendo como líder de mujeres. La recomiendo ampliamente."

fire_form 3 \
  --data-urlencode "Nombre=Ana Milagros" \
  --data-urlencode "Apellido=Pérez" \
  --data-urlencode "CorreoElectronico=ana.perez@logostest.edu" \
  --data-urlencode "Telefono=7188524410" \
  --data-urlencode "DeWhatsapp=7188524410" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Bethel" \
  --data-urlencode "NombreDelPastor=Rev. Samuel Ortega" \
  --data-urlencode "DireccionDeLaIglesia=340 Wyckoff Ave, Brooklyn NY 11237" \
  --data-urlencode "DireccionDeResidencia=124 Harman St Apt 3A, Brooklyn NY 11221" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "EsUsted=Líder" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=8 años" \
  --data-urlencode "CuantasVecesAsisteALaIglesiaEnLaSemana=3" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo y Ofrenda" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Líder de mujeres (6 años), Maestra de Escuela Bíblica (4 años), Coordinadora de evangelismo (2 años)" \
  --data-urlencode "ResumaSuTestimonio=Recibí al Señor a los 17 años en República Dominicana. Emigré a Estados Unidos en 2005 y continué sirviendo en la iglesia. Mi pasión es enseñar la Palabra de Dios a las mujeres de nuestra comunidad." \
  --data-urlencode "ResumeSuEntrenamientoBiblico=Estudios bíblicos en la iglesia por 5 años, seminario de consejería cristiana (2019), taller de evangelismo urbano (2021)" \
  --data-urlencode "ProfecionUOficioEspecifique=Asistente Administrativa" \
  --data-urlencode "AreaDeDesempenoProfesional=Administración" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "HabilidadesPersonales=Comunicación oral y escrita,Capacidad de trabajar en equipo,Empatía,Atención al detalle" \
  --data-urlencode "SoftwareOHerramientasQueManeja=Microsoft Office, Google Docs, Zoom" \
  --data-urlencode "ListeLosDocumentosQueEnvia=1- Título de Licenciatura en Administración. 2- Transcripts universitarios. 3- Diploma de escuela secundaria."

# -----------------------------------------------------------------------------
# NORMAL 2 — Carlos Eduardo Sánchez
# Master of Divinity. Has bachelor's + transcripts + undergraduate diploma.
# Pentecostal pastor, 15 years ministry. Bronx, NY. Puerto Rico origin.
# Budget: unrestricted. Full academic and document profile.
# EXPECTED: ELIGIBLE
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[A2] Carlos Eduardo Sánchez — Master of Divinity — Expected: ELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Carlos Eduardo" \
  --data-urlencode "LastNameApellido=Sánchez" \
  --data-urlencode "EmailICorreoElectronico=carlos.sanchez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=7184423391" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Aug 3, 1975" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Puerto Rico" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=875 Longwood Ave, Apt 5C" \
  --data-urlencode "City=Bronx" \
  --data-urlencode "State=NY" \
  --data-urlencode "PostalZipCode=10459" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Master - Maestria" \
  --data-urlencode "DesiredProgramProramaDeseado=Master of Divinity (M.Div)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Pentecostal" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=15 años" \
  --data-urlencode "DesdeCuandoPastoreaEnLaIglesia=5 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=200" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Copia del título de postgrado,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Carlos Eduardo" \
  --data-urlencode "Apellido=Sánchez" \
  --data-urlencode "CorreoElectronico=carlos.sanchez@logostest.edu" \
  --data-urlencode "TelefonoCelular=7184423391" \
  --data-urlencode "NombreDelPastor=Obispo Rafael Cruz" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Pentecostal Cristo Rey" \
  --data-urlencode "DireccionDeLaIglesia=1201 Southern Blvd, Bronx NY 10459" \
  --data-urlencode "DenominacionPertenece=Pentecostal" \
  --data-urlencode "CuantoTiempoHaConocidoAlAplicante=12 años" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Carlos es un pastor fiel con un corazón para la enseñanza. Tiene 5 años pastoreando nuestra iglesia con excelente fruto espiritual. Lo recomiendo sin reservaciones para el programa de Maestría."

fire_form 3 \
  --data-urlencode "Nombre=Carlos Eduardo" \
  --data-urlencode "Apellido=Sánchez" \
  --data-urlencode "CorreoElectronico=carlos.sanchez@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Pentecostal Cristo Rey" \
  --data-urlencode "NombreDelPastor=Obispo Rafael Cruz" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=15 años" \
  --data-urlencode "AQueDenominacionPertenece=Pentecostal" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastor principal (5 años), Diácono (4 años), Maestro de escuela bíblica (6 años), Líder de jóvenes (3 años)" \
  --data-urlencode "ResumaSuTestimonio=Recibí a Cristo a los 18 años durante una campaña evangelística. Dios me llamó al ministerio a los 25 años. He pastoreado la Iglesia Pentecostal Cristo Rey por 5 años y hemos visto crecer la congregación de 40 a 200 miembros." \
  --data-urlencode "ProfecionUOficioEspecifique=Pastor a tiempo completo" \
  --data-urlencode "AreaDeDesempenoProfesional=Docencia" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=15"

# -----------------------------------------------------------------------------
# NORMAL 3 — María del Carmen Rosario
# Certificate in Biblical Studies (open enrollment — no education requirements).
# High school only. Queens, NY. Cuba origin. Sunday school teacher 6 years.
# Budget: $50-100 (irrelevant for certificate — open enrollment).
# EXPECTED: ELIGIBLE (auto-approve, open enrollment)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[A3] María del Carmen Rosario — Certificate Estudios Bíblicos — Expected: ELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=María del Carmen" \
  --data-urlencode "LastNameApellido=Rosario" \
  --data-urlencode "EmailICorreoElectronico=maria.rosario@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=9294471820" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Nov 28, 1968" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Cuba" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=65-40 Booth St, Apt 2B" \
  --data-urlencode "City=Rego Park" \
  --data-urlencode "State=NY" \
  --data-urlencode "PostalZipCode=11374" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Certificate - Certificado" \
  --data-urlencode "DesiredProgramProramaDeseado=Certificado en Estudios Bíblicos" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Bíblicos" \
  --data-urlencode "AQueDenominacionPertenece=Bautista" \
  --data-urlencode "MinistryMinisterio=Leader/Líder" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=6 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=80" \
  --data-urlencode "BudgetsPresupuesto=50 USD - 100 USD" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "NameOfHighSchoolNombreDeLaEscuela=Instituto Pre-Universitario Havana" \
  --data-urlencode "GraduationYearAñoEnQueSeGraduo=Jun 1986" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del título de Secundaria"

fire_form 2 \
  --data-urlencode "Nombre=María del Carmen" \
  --data-urlencode "Apellido=Rosario" \
  --data-urlencode "CorreoElectronico=maria.rosario@logostest.edu" \
  --data-urlencode "TelefonoCelular=9294471820" \
  --data-urlencode "NombreDelPastor=Pastor Ernesto Delgado" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana de Queens" \
  --data-urlencode "DenominacionPertenece=Bautista" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=La hermana María tiene un hambre genuina por la Palabra de Dios. Es maestra fiel de escuela dominical desde hace 6 años. La recomiendo con entusiasmo."

fire_form 3 \
  --data-urlencode "Nombre=María del Carmen" \
  --data-urlencode "Apellido=Rosario" \
  --data-urlencode "CorreoElectronico=maria.rosario@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana de Queens" \
  --data-urlencode "NombreDelPastor=Pastor Ernesto Delgado" \
  --data-urlencode "EsUsted=Maestro" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=6 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo y Ofrenda" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Maestra de Escuela Dominical (6 años), Coordinadora del ministerio de mujeres (2 años)" \
  --data-urlencode "ResumaSuTestimonio=Llegué a Cristo en Cuba a los 20 años. Al emigrar a Estados Unidos encontré esta iglesia bautista donde he servido por 6 años enseñando la Palabra a niños y adultos." \
  --data-urlencode "ProfecionUOficioEspecifique=Costurera independiente" \
  --data-urlencode "AreaDeDesempenoProfesional=Freelancer" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años"

# -----------------------------------------------------------------------------
# NORMAL 4 — Roberto Antonio Jiménez
# Associate of Theological Studies (open enrollment).
# High school completed. Miami, FL. Colombia origin. Deacon 4 years.
# Budget: $50-100. All good for open enrollment.
# EXPECTED: ELIGIBLE (auto-approve, open enrollment)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[A4] Roberto Antonio Jiménez — Associate of Theological Studies — Expected: ELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Roberto Antonio" \
  --data-urlencode "LastNameApellido=Jiménez" \
  --data-urlencode "EmailICorreoElectronico=roberto.jimenez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=3055918847" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Feb 9, 1979" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Colombia" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=3820 NW 7th St" \
  --data-urlencode "City=Miami" \
  --data-urlencode "State=FL" \
  --data-urlencode "PostalZipCode=33126" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Associate - Tecnico Superior" \
  --data-urlencode "DesiredProgramProramaDeseado=Associate of Theological Studies" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Iglesia de Dios" \
  --data-urlencode "MinistryMinisterio=Diácono" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=9 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=150" \
  --data-urlencode "BudgetsPresupuesto=50 USD - 100 USD" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "NameOfHighSchoolNombreDeLaEscuela=Colegio Salesiano Don Bosco, Bogotá" \
  --data-urlencode "GraduationYearAñoEnQueSeGraduo=Nov 1997" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del título de Secundaria,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Roberto Antonio" \
  --data-urlencode "Apellido=Jiménez" \
  --data-urlencode "CorreoElectronico=roberto.jimenez@logostest.edu" \
  --data-urlencode "TelefonoCelular=3055918847" \
  --data-urlencode "NombreDelPastor=Pastor Héctor Montoya" \
  --data-urlencode "NombreDeLaIglesia=Iglesia de Dios Ministerio Hispano Miami" \
  --data-urlencode "DenominacionPertenece=Iglesia de Dios" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Roberto es un diácono ejemplar. Lleva 4 años sirviendo fielmente. Es responsable, honesto y tiene un genuino llamado al ministerio. Lo recomiendo para el programa asociado."

fire_form 3 \
  --data-urlencode "Nombre=Roberto Antonio" \
  --data-urlencode "Apellido=Jiménez" \
  --data-urlencode "CorreoElectronico=roberto.jimenez@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia de Dios Ministerio Hispano Miami" \
  --data-urlencode "NombreDelPastor=Pastor Héctor Montoya" \
  --data-urlencode "EsUsted=Diácono" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=9 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Diácono (4 años), Ujieres (3 años), Evangelismo en hospitales (2 años)" \
  --data-urlencode "ResumaSuTestimonio=Cristo me rescató de las drogas en 2001. Llevo 9 años en esta iglesia. Soy diácono desde 2020 y siento que Dios me llama a profundizar en la Palabra para servir mejor a Su pueblo." \
  --data-urlencode "ProfecionUOficioEspecifique=Técnico de aire acondicionado" \
  --data-urlencode "AreaDeDesempenoProfesional=Empleado" \
  --data-urlencode "AnosDeExperiencia=5-10 años"

# -----------------------------------------------------------------------------
# NORMAL 5 — Elena Patricia Vargas
# Doctor of Ministry (D.Min). Has master's + bachelor's + all docs.
# Houston, TX. Venezuela origin. Ordained pastor 12 years. Full academic path.
# Budget: unrestricted. Complete academic profile.
# EXPECTED: ELIGIBLE
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[A5] Elena Patricia Vargas — Doctor of Ministry — Expected: ELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Elena Patricia" \
  --data-urlencode "LastNameApellido=Vargas" \
  --data-urlencode "EmailICorreoElectronico=elena.vargas@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=7133029941" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Apr 22, 1970" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Venezuela" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=9821 Bissonnet St, Apt 104" \
  --data-urlencode "City=Houston" \
  --data-urlencode "State=TX" \
  --data-urlencode "PostalZipCode=77036" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Doctoral - Doctorado" \
  --data-urlencode "DesiredProgramProramaDeseado=Doctor of Ministry (D.Min)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Liderazgo & Coaching" \
  --data-urlencode "AQueDenominacionPertenece=Bautista" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=20 años" \
  --data-urlencode "DesdeCuandoPastoreaEnLaIglesia=12 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=350" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=Si tengo" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Copia del título de postgrado,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Elena Patricia" \
  --data-urlencode "Apellido=Vargas" \
  --data-urlencode "CorreoElectronico=elena.vargas@logostest.edu" \
  --data-urlencode "TelefonoCelular=7133029941" \
  --data-urlencode "NombreDelPastor=Dr. Antonio Reyes" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana de Houston" \
  --data-urlencode "DenominacionPertenece=Bautista" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=La Pastora Elena es una líder excepcional con 12 años de ministerio pastoral fructífero. Su preparación académica y espiritual la hacen una candidata ideal para el doctorado."

fire_form 3 \
  --data-urlencode "Nombre=Elena Patricia" \
  --data-urlencode "Apellido=Vargas" \
  --data-urlencode "CorreoElectronico=elena.vargas@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana de Houston" \
  --data-urlencode "NombreDelPastor=Dr. Antonio Reyes" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=20 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo y Ofrenda" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastora principal (12 años), Coordinadora regional de mujeres pastoras (5 años), Profesora del seminario local (8 años)" \
  --data-urlencode "ResumaSuTestimonio=Recibí el llamado al ministerio a los 28 años después de 8 años como maestra de escuela bíblica. Fundé nuestra congregación en 2013 y hemos crecido de 20 a 350 miembros. Mi tesis de maestría fue sobre liderazgo transformacional en iglesias hispanas urbanas." \
  --data-urlencode "ProfecionUOficioEspecifique=Pastora y profesora de teología a tiempo completo" \
  --data-urlencode "AreaDeDesempenoProfesional=Docencia" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=12"

# =============================================================================
# ██████████████████████████████████████████████████████████████████████████
#  SECTION B — 10 EDGE CASES
# ██████████████████████████████████████████████████████████████████████████
# =============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  SECTION B — EDGE CASES${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# -----------------------------------------------------------------------------
# EDGE 1 — Luis Alberto Mendoza
# Applies for PhD (Doctor of Religious Philosophy) WITHOUT an existing Th.D. or D.Min.
# Has only a bachelor's. Hard auto-reject rule: PhD requires existing doctorate.
# Bronx, NY. Dominican Republic. Married. 10 years in ministry as elder.
# EXPECTED: INELIGIBLE (auto-reject — PhD requires existing Th.D. or D.Min.)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B1] Luis Alberto Mendoza — PhD without existing doctorate — Expected: INELIGIBLE${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Luis Alberto" \
  --data-urlencode "LastNameApellido=Mendoza" \
  --data-urlencode "EmailICorreoElectronico=luis.mendoza@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=7184559302" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Sep 17, 1977" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Dom. Rep." \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=1640 University Ave, Apt 3F" \
  --data-urlencode "City=Bronx" \
  --data-urlencode "State=NY" \
  --data-urlencode "PostalZipCode=10453" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Doctoral - Doctorado" \
  --data-urlencode "DesiredProgramProramaDeseado=Doctor of Religious Philosophy (Ph.D)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Teología - Estudios Teológicos" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Anciano" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=14 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=180" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Luis Alberto" \
  --data-urlencode "Apellido=Mendoza" \
  --data-urlencode "CorreoElectronico=luis.mendoza@logostest.edu" \
  --data-urlencode "TelefonoCelular=7184559302" \
  --data-urlencode "NombreDelPastor=Pastor Ramón Tejeda" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Emmanuel" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Luis es un anciano serio y estudioso. Aunque no tiene doctorado, su hambre por el conocimiento bíblico es notable. Lo recomiendo, aunque sugiero comenzar por el nivel de maestría."

fire_form 3 \
  --data-urlencode "Nombre=Luis Alberto" \
  --data-urlencode "Apellido=Mendoza" \
  --data-urlencode "CorreoElectronico=luis.mendoza@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Emmanuel" \
  --data-urlencode "NombreDelPastor=Pastor Ramón Tejeda" \
  --data-urlencode "EsUsted=Anciano" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=14 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Anciano (4 años), Maestro de escuela bíblica (7 años), Líder de grupos pequeños (5 años)" \
  --data-urlencode "ResumaSuTestimonio=Llevo 14 años sirviendo al Señor y siento un llamado claro a la investigación teológica. Quiero hacer el PhD para enseñar a nivel universitario." \
  --data-urlencode "ProfecionUOficioEspecifique=Contador público" \
  --data-urlencode "AreaDeDesempenoProfesional=Administración" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=10"

# -----------------------------------------------------------------------------
# EDGE 2 — Carmen Rosa López
# Master of Divinity but budget is only $25-$50/month.
# Budget gates out: $25-50 → institute/certificate only. Master = high tier required.
# Has bachelor's and all docs — only issue is budget mismatch.
# Manhattan, NY. Mexico origin. Married. Sunday school director.
# EXPECTED: FINANCIAL FLAG (suggested alternative: Certificate or Associate first)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B2] Carmen Rosa López — Master with \$25-50 budget — Expected: FINANCIAL FLAG${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Carmen Rosa" \
  --data-urlencode "LastNameApellido=López" \
  --data-urlencode "EmailICorreoElectronico=carmen.lopez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=2124889031" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Jul 5, 1983" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Mexico" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=505 W 162nd St, Apt 4D" \
  --data-urlencode "City=New York" \
  --data-urlencode "State=NY" \
  --data-urlencode "PostalZipCode=10032" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Master - Maestria" \
  --data-urlencode "DesiredProgramProramaDeseado=Master of Divinity (M.Div)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Presbiteriana" \
  --data-urlencode "MinistryMinisterio=Leader/Líder" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=10 años" \
  --data-urlencode "BudgetsPresupuesto=25 USD - 50 USD" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Copia del título de postgrado,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Carmen Rosa" \
  --data-urlencode "Apellido=López" \
  --data-urlencode "CorreoElectronico=carmen.lopez@logostest.edu" \
  --data-urlencode "TelefonoCelular=2124889031" \
  --data-urlencode "NombreDelPastor=Pastor James McAllister" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Presbiteriana Washington Heights" \
  --data-urlencode "DenominacionPertenece=Presbiteriana" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Carmen es directora de escuela dominical y tiene excelente capacidad pedagógica. La recomiendo, aunque su situación económica actual puede ser un reto para el programa de maestría."

fire_form 3 \
  --data-urlencode "Nombre=Carmen Rosa" \
  --data-urlencode "Apellido=López" \
  --data-urlencode "CorreoElectronico=carmen.lopez@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Presbiteriana Washington Heights" \
  --data-urlencode "NombreDelPastor=Pastor James McAllister" \
  --data-urlencode "EsUsted=Maestro" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=10 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Directora de escuela dominical (5 años), Maestra de adultos (8 años), Líder de alabanza (3 años)" \
  --data-urlencode "ResumaSuTestimonio=Soy cristiana desde los 15 años. Mi pasión es la educación cristiana. Trabajo como maestra en escuela pública de día y sirvo en el ministerio los fines de semana." \
  --data-urlencode "ProfecionUOficioEspecifique=Maestra de escuela primaria" \
  --data-urlencode "AreaDeDesempenoProfesional=Docencia" \
  --data-urlencode "AnosDeExperiencia=5-10 años"

# -----------------------------------------------------------------------------
# EDGE 3 — José Miguel Martínez
# Bachelor of Theology. Has a bachelor's degree — but submitted NO documents at all.
# Document gate should flag: missing transcripts and diploma.
# Jersey City, NJ. El Salvador origin. Married. Church elder 6 years.
# EXPECTED: DOCUMENT FLAG (missing transcripts + diploma)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B3] José Miguel Martínez — Bachelor, NO documents submitted — Expected: DOCUMENT FLAG${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=José Miguel" \
  --data-urlencode "LastNameApellido=Martínez" \
  --data-urlencode "EmailICorreoElectronico=jose.martinez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=2018834402" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Dec 1, 1980" \
  --data-urlencode "BirthCountryPaisDeNacimiento=El Salvador" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=280 Newark Ave, Apt 2R" \
  --data-urlencode "City=Jersey City" \
  --data-urlencode "State=NJ" \
  --data-urlencode "PostalZipCode=07302" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Bachelor - Licenciatura" \
  --data-urlencode "DesiredProgramProramaDeseado=Bachelor of Theology (B.Th)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Teología - Estudios Teológicos" \
  --data-urlencode "AQueDenominacionPertenece=Asamblea de Dios" \
  --data-urlencode "MinistryMinisterio=Anciano" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=11 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=95" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen="

fire_form 2 \
  --data-urlencode "Nombre=José Miguel" \
  --data-urlencode "Apellido=Martínez" \
  --data-urlencode "CorreoElectronico=jose.martinez@logostest.edu" \
  --data-urlencode "TelefonoCelular=2018834402" \
  --data-urlencode "NombreDelPastor=Pastor Eliseo Fuentes" \
  --data-urlencode "NombreDeLaIglesia=Asamblea de Dios Hispana de Jersey City" \
  --data-urlencode "DenominacionPertenece=Asamblea de Dios" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=José es un anciano comprometido. Olvidó incluir sus documentos académicos en esta solicitud pero puedo confirmar que tiene su licenciatura de la Universidad de El Salvador."

fire_form 3 \
  --data-urlencode "Nombre=José Miguel" \
  --data-urlencode "Apellido=Martínez" \
  --data-urlencode "CorreoElectronico=jose.martinez@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Asamblea de Dios Hispana de Jersey City" \
  --data-urlencode "NombreDelPastor=Pastor Eliseo Fuentes" \
  --data-urlencode "EsUsted=Anciano" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=11 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Anciano (6 años), Maestro de jóvenes (5 años), Evangelismo en las calles (4 años)" \
  --data-urlencode "ResumaSuTestimonio=Vine a Cristo durante una crisis personal en 2008. Desde entonces he dedicado mi vida al servicio de la iglesia. Los documentos académicos los enviaré por correo esta semana." \
  --data-urlencode "ProfecionUOficioEspecifique=Electricista" \
  --data-urlencode "AreaDeDesempenoProfesional=Empleado" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años"

# -----------------------------------------------------------------------------
# EDGE 4 — Rosa Elena Guerrero
# Master of Divinity. ONLY high school education — no college at all.
# BUT has 15 years full-time ministry as a pastor.
# Exceptional ministerial experience may qualify her via the AI review path.
# Newark, NJ. Guatemala origin. Widow. Pastor of a 75-person congregation.
# EXPECTED: NEEDS REVIEW (exceptional ministry, below education threshold — AI decides)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B4] Rosa Elena Guerrero — Master, high school only, 15yr fulltime ministry — Expected: NEEDS REVIEW${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Rosa Elena" \
  --data-urlencode "LastNameApellido=Guerrero" \
  --data-urlencode "EmailICorreoElectronico=rosa.guerrero@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=9732218804" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Jan 12, 1965" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Guatemala" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Widow/Viudo(a)" \
  --data-urlencode "StreetAddress=45 Orient Ave" \
  --data-urlencode "City=Newark" \
  --data-urlencode "State=NJ" \
  --data-urlencode "PostalZipCode=07105" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Master - Maestria" \
  --data-urlencode "DesiredProgramProramaDeseado=Master of Divinity (M.Div)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=20 años" \
  --data-urlencode "DesdeCuandoPastoreaEnLaIglesia=15 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=75" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del título de Secundaria"

fire_form 2 \
  --data-urlencode "Nombre=Rosa Elena" \
  --data-urlencode "Apellido=Guerrero" \
  --data-urlencode "CorreoElectronico=rosa.guerrero@logostest.edu" \
  --data-urlencode "TelefonoCelular=9732218804" \
  --data-urlencode "NombreDelPastor=Obispo Gerardo Fuentes" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Ríos de Agua Viva" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=La pastora Rosa fundó su iglesia hace 15 años desde cero. No tiene estudios universitarios formales pero su conocimiento bíblico y su fruto ministerial son extraordinarios. 75 almas bajo su cuidado. La recomiendo altamente."

fire_form 3 \
  --data-urlencode "Nombre=Rosa Elena" \
  --data-urlencode "Apellido=Guerrero" \
  --data-urlencode "CorreoElectronico=rosa.guerrero@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Ríos de Agua Viva" \
  --data-urlencode "NombreDelPastor=Obispo Gerardo Fuentes" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=20 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo y Ofrenda" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastora fundadora (15 años), Coordinadora de mujeres de la region (8 años), Evangelista (5 años antes de fundar la iglesia)" \
  --data-urlencode "ResumaSuTestimonio=Fundé la Iglesia Ríos de Agua Viva en 2009 con 4 familias. Hoy somos 75 miembros activos. No tuve la oportunidad de estudiar en la universidad cuando joven pero he estudiado la Biblia intensamente por 20 años y completé 3 programas de capacitación ministerial." \
  --data-urlencode "ResumeSuEntrenamientoBiblico=Programa de formación pastoral (3 años), Escuela de líderes del Concilio Evangélico (2 años), Entrenamiento para plantadores de iglesias (1 año), Estudio personal intensivo por 15 años" \
  --data-urlencode "ProfecionUOficioEspecifique=Pastora a tiempo completo" \
  --data-urlencode "AreaDeDesempenoProfesional=Empleado" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=15"

# -----------------------------------------------------------------------------
# EDGE 5 — Miguel Ángel Torres
# Doctor of Ministry (D.Min). Has ONLY associate degree — below master's requirement.
# But has 12 years FULL-TIME pastoral ministry. Classic D.Min exception candidate.
# Chicago, IL. Puerto Rico origin. Ordained pastor. 90-person church.
# EXPECTED: NEEDS REVIEW (associate + 12yr fulltime — at edge of exception threshold)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B5] Miguel Ángel Torres — D.Min, associate only, 12yr fulltime ministry — Expected: NEEDS REVIEW${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Miguel Ángel" \
  --data-urlencode "LastNameApellido=Torres" \
  --data-urlencode "EmailICorreoElectronico=miguel.torres@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=7732441099" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Mar 29, 1972" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Puerto Rico" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=2230 S Millard Ave" \
  --data-urlencode "City=Chicago" \
  --data-urlencode "State=IL" \
  --data-urlencode "PostalZipCode=60623" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Doctoral - Doctorado" \
  --data-urlencode "DesiredProgramProramaDeseado=Doctor of Ministry (D.Min)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Pentecostal" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=18 años" \
  --data-urlencode "DesdeCuandoPastoreaEnLaIglesia=12 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=90" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=Si, complete el estudio" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del Associate - Técnico,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Miguel Ángel" \
  --data-urlencode "Apellido=Torres" \
  --data-urlencode "CorreoElectronico=miguel.torres@logostest.edu" \
  --data-urlencode "TelefonoCelular=7732441099" \
  --data-urlencode "NombreDelPastor=Obispo Luis Cardona" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Pentecostal Fuente de Vida Chicago" \
  --data-urlencode "DenominacionPertenece=Pentecostal" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=El pastor Miguel lleva 12 años al frente de su congregación. Aunque no tiene maestría, su experiencia pastoral y su madurez espiritual superan a muchos con títulos académicos. Lo recomiendo con convicción para el D.Min."

fire_form 3 \
  --data-urlencode "Nombre=Miguel Ángel" \
  --data-urlencode "Apellido=Torres" \
  --data-urlencode "CorreoElectronico=miguel.torres@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Pentecostal Fuente de Vida Chicago" \
  --data-urlencode "NombreDelPastor=Obispo Luis Cardona" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=18 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastor principal (12 años), Diácono (4 años), Maestro escuela bíblica (3 años), Plantador de iglesias asistente (2 años)" \
  --data-urlencode "ResumaSuTestimonio=Nací en un hogar cristiano en Puerto Rico. Comencé a pastorear a los 32 años. He plantado 2 misiones desde nuestra iglesia madre. Mi meta es completar el D.Min para enseñar en seminarios hispanos." \
  --data-urlencode "ProfecionUOficioEspecifique=Pastor y carpintero" \
  --data-urlencode "AreaDeDesempenoProfesional=Empleado" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=12"

# -----------------------------------------------------------------------------
# EDGE 6 — Isabel Fernanda Reyes
# Master of Divinity. Has bachelor's degree and transcripts — but did NOT include
# the undergraduate diploma. Graduate programs require the undergraduate diploma
# specifically (not just transcripts).
# Orlando, FL. Dominican Republic origin. Married. Associate pastor 4 years.
# EXPECTED: DOCUMENT FLAG (transcripts present, undergraduate diploma missing)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B6] Isabel Fernanda Reyes — Master, has transcripts, missing undergrad diploma — Expected: DOCUMENT FLAG${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Isabel Fernanda" \
  --data-urlencode "LastNameApellido=Reyes" \
  --data-urlencode "EmailICorreoElectronico=isabel.reyes@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=4074819203" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Jun 30, 1984" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Dom. Rep." \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=7201 Arbor Oaks Dr, Apt 201" \
  --data-urlencode "City=Orlando" \
  --data-urlencode "State=FL" \
  --data-urlencode "PostalZipCode=32822" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Master - Maestria" \
  --data-urlencode "DesiredProgramProramaDeseado=Master of Divinity (M.Div)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=12 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=130" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Isabel Fernanda" \
  --data-urlencode "Apellido=Reyes" \
  --data-urlencode "CorreoElectronico=isabel.reyes@logostest.edu" \
  --data-urlencode "TelefonoCelular=4074819203" \
  --data-urlencode "NombreDelPastor=Pastor Lorenzo Abreu" \
  --data-urlencode "NombreDeLaIglesia=Centro Cristiano Alfa y Omega Orlando" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Isabel es pastora asociada desde 2020. Tiene su licenciatura de la PUCMM en República Dominicana pero aún no ha podido legalizar el diploma para los Estados Unidos. Tiene los transcripts."

fire_form 3 \
  --data-urlencode "Nombre=Isabel Fernanda" \
  --data-urlencode "Apellido=Reyes" \
  --data-urlencode "CorreoElectronico=isabel.reyes@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Centro Cristiano Alfa y Omega Orlando" \
  --data-urlencode "NombreDelPastor=Pastor Lorenzo Abreu" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=12 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastora asociada (4 años), Maestra de mujeres adultas (6 años), Directora de drama ministerial (3 años)" \
  --data-urlencode "ResumaSuTestimonio=Me gradué de la PUCMM en Rep. Dom. con licenciatura en Comunicación. Emigré en 2011 y continué mi formación en la iglesia. Siento que el M.Div me equipará para pastorear con mayor profundidad bíblica y teológica." \
  --data-urlencode "ProfecionUOficioEspecifique=Comunicadora y pastora" \
  --data-urlencode "AreaDeDesempenoProfesional=Medios" \
  --data-urlencode "AnosDeExperiencia=5-10 años"

# -----------------------------------------------------------------------------
# EDGE 7 — Francisco Javier Ruiz
# Doctor of Ministry. Has bachelor's degree (no master's) + 10 years associated
# ministry. Right at the boundary threshold — may qualify via exception.
# Dallas, TX. Ecuador origin. Married. Elder/deacon 10 years.
# EXPECTED: NEEDS REVIEW (bachelor + 10yr associated — at exact edge of D.Min threshold)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B7] Francisco Javier Ruiz — D.Min, bachelor + 10yr associated — Expected: NEEDS REVIEW${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Francisco Javier" \
  --data-urlencode "LastNameApellido=Ruiz" \
  --data-urlencode "EmailICorreoElectronico=francisco.ruiz@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=2147710038" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Nov 4, 1971" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Ecuador" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=4520 Bryan St, Apt 1A" \
  --data-urlencode "City=Dallas" \
  --data-urlencode "State=TX" \
  --data-urlencode "PostalZipCode=75204" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Doctoral - Doctorado" \
  --data-urlencode "DesiredProgramProramaDeseado=Doctor of Ministry (D.Min)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Liderazgo & Coaching" \
  --data-urlencode "AQueDenominacionPertenece=Iglesia de Dios" \
  --data-urlencode "MinistryMinisterio=Anciano" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=16 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=220" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Francisco Javier" \
  --data-urlencode "Apellido=Ruiz" \
  --data-urlencode "CorreoElectronico=francisco.ruiz@logostest.edu" \
  --data-urlencode "TelefonoCelular=2147710038" \
  --data-urlencode "NombreDelPastor=Pastor Pedro Navarro" \
  --data-urlencode "NombreDeLaIglesia=Iglesia de Dios Dallas Hispano" \
  --data-urlencode "DenominacionPertenece=Iglesia de Dios" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Francisco lleva 10 años como anciano principal. No tiene maestría pero su preparación en la Palabra y su madurez de carácter son sobresalientes. Creo que puede hacer el D.Min con la experiencia como compensación."

fire_form 3 \
  --data-urlencode "Nombre=Francisco Javier" \
  --data-urlencode "Apellido=Ruiz" \
  --data-urlencode "CorreoElectronico=francisco.ruiz@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia de Dios Dallas Hispano" \
  --data-urlencode "NombreDelPastor=Pastor Pedro Navarro" \
  --data-urlencode "EsUsted=Anciano" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=16 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Anciano principal (10 años), Maestro de adultos (8 años), Director de evangelismo urbano (5 años)" \
  --data-urlencode "ResumaSuTestimonio=Vine a los pies de Cristo en 2001 en Ecuador. Emigré a Dallas en 2006 y me integré a esta iglesia. He servido como anciano por 10 años y siento que el D.Min me llamará a un ministerio más profundo a nivel regional." \
  --data-urlencode "ProfecionUOficioEspecifique=Ingeniero civil" \
  --data-urlencode "AreaDeDesempenoProfesional=Ingeniería" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_associated=10"

# -----------------------------------------------------------------------------
# EDGE 8 — Teresa María Morales
# Associate of Theological Studies. Budget is only $25-$50/month.
# Associate level requires "medium" budget ($50-$100). Budget too low.
# Los Angeles, CA. Honduras origin. Widow. Sunday school teacher.
# EXPECTED: FINANCIAL FLAG (associate requires $50-100/month minimum)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B8] Teresa María Morales — Associate program, \$25-50 budget — Expected: FINANCIAL FLAG${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Teresa María" \
  --data-urlencode "LastNameApellido=Morales" \
  --data-urlencode "EmailICorreoElectronico=teresa.morales@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=3232188847" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Aug 20, 1961" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Honduras" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Widow/Viudo(a)" \
  --data-urlencode "StreetAddress=821 S Bonnie Brae St" \
  --data-urlencode "City=Los Angeles" \
  --data-urlencode "State=CA" \
  --data-urlencode "PostalZipCode=90057" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Associate - Tecnico Superior" \
  --data-urlencode "DesiredProgramProramaDeseado=Associate of Theological Studies" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Bíblicos" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Leader/Líder" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=17 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=60" \
  --data-urlencode "BudgetsPresupuesto=25 USD - 50 USD" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del título de Secundaria"

fire_form 2 \
  --data-urlencode "Nombre=Teresa María" \
  --data-urlencode "Apellido=Morales" \
  --data-urlencode "CorreoElectronico=teresa.morales@logostest.edu" \
  --data-urlencode "TelefonoCelular=3232188847" \
  --data-urlencode "NombreDelPastor=Pastor Julio Espinoza" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Roca de Salvación LA" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Teresa es maestra fiel de escuela dominical desde hace 9 años. Es viuda con ingreso limitado. Su deseo de crecer académicamente es genuino."

fire_form 3 \
  --data-urlencode "Nombre=Teresa María" \
  --data-urlencode "Apellido=Morales" \
  --data-urlencode "CorreoElectronico=teresa.morales@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Evangélica Roca de Salvación LA" \
  --data-urlencode "NombreDelPastor=Pastor Julio Espinoza" \
  --data-urlencode "EsUsted=Maestro" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=17 años" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Maestra de escuela dominical (9 años), Ministerio de cocina para indigentes (4 años), Coro de la iglesia (7 años)" \
  --data-urlencode "ResumaSuTestimonio=Enviudé en 2015 y el Señor fue mi fortaleza. Desde entonces me he dedicado aún más al servicio de la iglesia. Vivo con presupuesto muy limitado pero quiero crecer en el conocimiento de la Palabra." \
  --data-urlencode "ProfecionUOficioEspecifique=Empleada doméstica" \
  --data-urlencode "AreaDeDesempenoProfesional=Empleado" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años"

# -----------------------------------------------------------------------------
# EDGE 9 — Antonio Rafael Flores
# Doctor of Ministry. Has an EXISTING doctorate (Th.D.) — passes PhD gate.
# BUT submitted NO documents at all. Needs transcripts + undergraduate diploma.
# San Antonio, TX. Cuba origin. Married. Senior pastor 8 years.
# EXPECTED: DOCUMENT FLAG (has doctorate but missing transcripts + undergraduate diploma)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B9] Antonio Rafael Flores — D.Min, has Th.D., zero documents — Expected: DOCUMENT FLAG${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Antonio Rafael" \
  --data-urlencode "LastNameApellido=Flores" \
  --data-urlencode "EmailICorreoElectronico=antonio.flores@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=2108897761" \
  --data-urlencode "GenderGenero=Male/Masculino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=May 18, 1963" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Cuba" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=7002 Blanco Rd, Suite 100" \
  --data-urlencode "City=San Antonio" \
  --data-urlencode "State=TX" \
  --data-urlencode "PostalZipCode=78216" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Doctoral - Doctorado" \
  --data-urlencode "DesiredProgramProramaDeseado=Doctor of Ministry (D.Min)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Estudios Pastorales" \
  --data-urlencode "AQueDenominacionPertenece=Bautista" \
  --data-urlencode "MinistryMinisterio=Pastor" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=22 años" \
  --data-urlencode "DesdeCuandoPastoreaEnLaIglesia=8 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=280" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=No tengo estudios universitarios" \
  --data-urlencode "Licenciatura=Si tengo" \
  --data-urlencode "Maestria=Si tengo" \
  --data-urlencode "Doctorado=Si tengo" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen="

fire_form 2 \
  --data-urlencode "Nombre=Antonio Rafael" \
  --data-urlencode "Apellido=Flores" \
  --data-urlencode "CorreoElectronico=antonio.flores@logostest.edu" \
  --data-urlencode "TelefonoCelular=2108897761" \
  --data-urlencode "NombreDelPastor=Dr. Marco Hernández" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana San Antonio" \
  --data-urlencode "DenominacionPertenece=Bautista" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=El Pastor Antonio tiene un Th.D. de la Universidad Bautista Internacional. Olvidó incluir sus documentos. Los tengo en archivo y puedo confirmar su autenticidad."

fire_form 3 \
  --data-urlencode "Nombre=Antonio Rafael" \
  --data-urlencode "Apellido=Flores" \
  --data-urlencode "CorreoElectronico=antonio.flores@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Primera Iglesia Bautista Hispana San Antonio" \
  --data-urlencode "NombreDelPastor=Dr. Marco Hernández" \
  --data-urlencode "EsUsted=Pastor" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=22 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Pastor principal (8 años), Profesor de teología (10 años), Director de misiones (5 años)" \
  --data-urlencode "ResumaSuTestimonio=Emigré de Cuba en 1994. Completé mi Th.D. en 2010. Sirvo como pastor principal desde 2016. Quiero el D.Min para enfatizar la práctica ministerial junto a mi formación teórica. Los documentos académicos los enviaré por correo urgente." \
  --data-urlencode "ProfecionUOficioEspecifique=Pastor y profesor de teología" \
  --data-urlencode "AreaDeDesempenoProfesional=Docencia" \
  --data-urlencode "AnosDeExperiencia=Más de 10 años" \
  --data-urlencode "ministerial_years_fulltime=8"

# -----------------------------------------------------------------------------
# EDGE 10 — Sofía Beatriz Ramírez
# Bachelor of Theology. Has ONLY associate degree — no bachelor's yet.
# BUT has 10+ years of ministry as a Bible school teacher and deaconess.
# Life credit candidate: up to 30 credits for 12+ years ministry,
# applicable up to Bachelor level. Good candidate for exception.
# Philadelphia, PA. Peru origin. Married. Ministry teacher.
# EXPECTED: NEEDS REVIEW (associate + strong ministry, no bachelor — life credit candidate)
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[B10] Sofía Beatriz Ramírez — Bachelor, has only associate, 10yr ministry — Expected: NEEDS REVIEW${NC}"

fire_form 1 \
  --data-urlencode "FirstNmeNombre=Sofía Beatriz" \
  --data-urlencode "LastNameApellido=Ramírez" \
  --data-urlencode "EmailICorreoElectronico=sofia.ramirez@logostest.edu" \
  --data-urlencode "PhoneMobileCelular=2155819034" \
  --data-urlencode "GenderGenero=Female/Femenino" \
  --data-urlencode "DateOfBirthFechadeNacimiento=Sep 6, 1978" \
  --data-urlencode "BirthCountryPaisDeNacimiento=Peru" \
  --data-urlencode "CountryOfCitizenshipPaisDeOrigen=United States" \
  --data-urlencode "MaritalStatusEstadoCivil=Married / Casado(a)" \
  --data-urlencode "StreetAddress=2311 N 5th St" \
  --data-urlencode "City=Philadelphia" \
  --data-urlencode "State=PA" \
  --data-urlencode "PostalZipCode=19133" \
  --data-urlencode "StudyLevelsNivelesDeEstudio=Bachelor - Licenciatura" \
  --data-urlencode "DesiredProgramProramaDeseado=Bachelor of Theology (B.Th)" \
  --data-urlencode "AreaOfInterestAreaDeInteres=Teología - Estudios Teológicos" \
  --data-urlencode "AQueDenominacionPertenece=Evangelica" \
  --data-urlencode "MinistryMinisterio=Diaconisa" \
  --data-urlencode "DesdeCuandoAsisteLaIglesia=13 años" \
  --data-urlencode "CuantasPersonasAsistenALaIglesia=110" \
  --data-urlencode "CompletoSuEscuelaSecundaria=SI" \
  --data-urlencode "Associate=Si, complete el estudio" \
  --data-urlencode "Licenciatura=No tengo" \
  --data-urlencode "Maestria=No tengo estudios de posgrado" \
  --data-urlencode "Doctorado=No tengo estudios de posgrado" \
  --data-urlencode "MarqueLosDocumentosQueEstaIncluyen=Copia del Associate - Técnico,Transcripts - Registros oficiales de Notas de grado"

fire_form 2 \
  --data-urlencode "Nombre=Sofía Beatriz" \
  --data-urlencode "Apellido=Ramírez" \
  --data-urlencode "CorreoElectronico=sofia.ramirez@logostest.edu" \
  --data-urlencode "TelefonoCelular=2155819034" \
  --data-urlencode "NombreDelPastor=Pastor Félix Quispe" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Cristiana Camino de Vida Philadelphia" \
  --data-urlencode "DenominacionPertenece=Evangelica" \
  --data-urlencode "RecomendariaAEstaPersona=Sí" \
  --data-urlencode "ComentariosDelPastor=Sofía es una de las maestras de Biblia más capaces que conozco. Ha enseñado la Escuela Bíblica por 10 años con gran dominio de la Escritura. Tiene Associate pero no Bachelor. Creo que califica perfectamente para la licenciatura con su experiencia ministerial."

fire_form 3 \
  --data-urlencode "Nombre=Sofía Beatriz" \
  --data-urlencode "Apellido=Ramírez" \
  --data-urlencode "CorreoElectronico=sofia.ramirez@logostest.edu" \
  --data-urlencode "NombreDeLaIglesia=Iglesia Cristiana Camino de Vida Philadelphia" \
  --data-urlencode "NombreDelPastor=Pastor Félix Quispe" \
  --data-urlencode "EsUsted=Diácono" \
  --data-urlencode "HaceCuantosAnosQueAsisteALaIglesia=13 años" \
  --data-urlencode "ApoyaALaIglesiaFinancieramente=Sí - Diezmo y Ofrenda" \
  --data-urlencode "ListeLosMinisteriosEnLosQueHaEstadoInvolucrado=Maestra de Escuela Bíblica (10 años — adultos, jóvenes, niños), Diaconisa (5 años), Coordinadora de grupos de oración (4 años), Consejera de mujeres (3 años)" \
  --data-urlencode "ResumaSuTestimonio=Soy cristiana desde los 16 años en Lima, Perú. Emigré a Filadelfia en 2005. He enseñado la Biblia por 10 años ininterrumpidos. Completé el Associate aquí en LOGOS y ahora siento que el Señor me llama a completar la licenciatura para servir con mayor profundidad." \
  --data-urlencode "ResumeSuEntrenamientoBiblico=Associate of Biblical Studies en LOGOS (completado), Cursos de hermenéutica y exégesis, Seminario de consejería bíblica (2018), Entrenamiento en predicación expositiva" \
  --data-urlencode "ProfecionUOficioEspecifique=Maestra bilingüe en escuela cristiana" \
  --data-urlencode "AreaDeDesempenoProfesional=Docencia" \
  --data-urlencode "AnosDeExperiencia=5-10 años" \
  --data-urlencode "ministerial_years_associated=10"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}  All 15 test cases submitted.${NC}"
echo ""
echo -e "${CYAN}  Expected Results:${NC}"
echo -e "  ${GREEN}ELIGIBLE${NC}        A1 Ana Pérez (B.Th), A2 Carlos Sánchez (M.Div),"
echo -e "                  A3 María Rosario (Certificate), A4 Roberto Jiménez (Associate),"
echo -e "                  A5 Elena Vargas (D.Min)"
echo -e "  ${RED}INELIGIBLE${NC}      B1 Luis Mendoza (PhD no doctorate)"
echo -e "  ${YELLOW}FINANCIAL FLAG${NC}  B2 Carmen López (Master \$25-50 budget),"
echo -e "                  B8 Teresa Morales (Associate \$25-50 budget)"
echo -e "  ${YELLOW}DOCUMENT FLAG${NC}   B3 José Martínez (Bachelor no docs),"
echo -e "                  B6 Isabel Reyes (Master no undergrad diploma),"
echo -e "                  B9 Antonio Flores (D.Min has Th.D. but no docs)"
echo -e "  ${CYAN}NEEDS REVIEW${NC}    B4 Rosa Guerrero (Master 15yr ministry no college),"
echo -e "                  B5 Miguel Torres (D.Min associate 12yr fulltime),"
echo -e "                  B7 Francisco Ruiz (D.Min bachelor 10yr associated),"
echo -e "                  B10 Sofía Ramírez (Bachelor associate 10yr ministry)"
echo ""
echo -e "${CYAN}  View results at: https://logos-murex-mu.vercel.app${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
