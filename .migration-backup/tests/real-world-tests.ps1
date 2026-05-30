# =============================================================================
# LOGOS Admissions — Real-World Test Suite
# Uses realistic names, full form data, and covers every engine rule + AI edge case.
#
# Run:  powershell -ExecutionPolicy Bypass -File tests/real-world-tests.ps1
#
# Expected outcomes are documented per test so results can be verified at a glance.
# =============================================================================

$BASE_URL = "https://logos-production-c920.up.railway.app"
$SECRET   = "logos-webhook-2026"

# Accent helpers (avoids encoding corruption in .ps1 files)
$i_acute = [char]237   # í
$e_acute = [char]233   # é
$o_acute = [char]243   # ó
$a_acute = [char]225   # á
$u_acute = [char]250   # ú
$n_tilde = [char]241   # ñ

$passed = 0
$failed = 0
$results = @()

function Send-Application {
    param(
        [string]$TestName,
        [string]$Expected,   # e.g. "ELIGIBLE", "INELIGIBLE", "NEEDS_REVIEW:document", "NEEDS_REVIEW:financial", "NEEDS_REVIEW:ai"
        [string]$Email,
        [string]$FirstName,
        [string]$LastName,
        [string]$Phone = "7865550100",
        [string]$Church = "Iglesia Cristiana Restauracion",
        [string]$Pastor = "Rev. Samuel Ortega",
        [string]$Denomination = "Pentecostal",
        [hashtable]$Form1Fields,
        [hashtable]$Form2Fields,
        [hashtable]$Form3Fields
    )

    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "TEST: $TestName" -ForegroundColor Yellow
    Write-Host "Expected: $Expected" -ForegroundColor Magenta
    Write-Host "Applicant: $FirstName $LastName <$Email>" -ForegroundColor Gray

    # ── Form 1 base (application)
    $f1 = @{
        "FirstNmeNombre"               = $FirstName
        "LastNameApellido"             = $LastName
        "EmailICorreoElectronico"      = $Email
        "EmailICorreoElectrónicoI"     = $Email
        "PhoneMobileCelular"           = $Phone
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Biblical Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Associate"                    = "No tengo estudios universitarios"
        "Licenciatura"                 = "No tengo"
        "Maestria"                     = "No tengo estudios de posgrado"
        "Doctorado"                    = "No tengo un doctorado todavia"
        "AQueDenominacionPertenece"    = $Denomination
        "NombreDelPastor"              = $Pastor
        "NombreDeLaIglesia"            = $Church
    }
    foreach ($k in $Form1Fields.Keys) { $f1[$k] = $Form1Fields[$k] }

    # ── Form 2 base (background / ministry info)
    $f2 = @{
        "Nombre"                      = $FirstName
        "Apellido"                    = $LastName
        "CorreoElectronico"           = $Email
        "TelefonoCelular"             = $Phone
        "NombreDelPastor"             = $Pastor
        "NombreDeLaIglesia"           = $Church
        "AQueDenominacionPertenece"   = $Denomination
    }
    foreach ($k in $Form2Fields.Keys) { $f2[$k] = $Form2Fields[$k] }

    # ── Form 3 base (documents)
    $f3 = @{
        "Nombre"            = $FirstName
        "Apellido"          = $LastName
        "CorreoElectronico" = $Email
        "TelefonoCelular"   = $Phone
        "NombreDeLaIglesia" = $Church
        "NombreDelPastor"   = $Pastor
    }
    foreach ($k in $Form3Fields.Keys) { $f3[$k] = $Form3Fields[$k] }

    $sep = [char]38

    try {
        $parts1 = @(); foreach ($k in $f1.Keys) { $parts1 += "$k=$([System.Uri]::EscapeDataString($f1[$k]))" }
        $r1 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/1" -Method POST `
            -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
            -Body ($parts1 -join $sep) -UseBasicParsing
        $s1 = $r1.StatusCode

        Start-Sleep -Milliseconds 400

        $parts2 = @(); foreach ($k in $f2.Keys) { $parts2 += "$k=$([System.Uri]::EscapeDataString($f2[$k]))" }
        $r2 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/2" -Method POST `
            -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
            -Body ($parts2 -join $sep) -UseBasicParsing
        $s2 = $r2.StatusCode

        Start-Sleep -Milliseconds 400

        $parts3 = @(); foreach ($k in $f3.Keys) { $parts3 += "$k=$([System.Uri]::EscapeDataString($f3[$k]))" }
        $r3 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/3" -Method POST `
            -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
            -Body ($parts3 -join $sep) -UseBasicParsing
        $s3 = $r3.StatusCode

        $ok = ($s1 -eq 200 -and $s2 -eq 200 -and $s3 -eq 200)
        if ($ok) {
            Write-Host "  Forms 1/2/3: OK (200/200/200)" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "  Forms 1/2/3: $s1 / $s2 / $s3  ← UNEXPECTED STATUS" -ForegroundColor Red
            $script:failed++
        }
        $script:results += [PSCustomObject]@{ Test=$TestName; Expected=$Expected; Status=if ($ok) {"SENT"} else {"ERROR"}; Email=$Email }
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $script:failed++
        $script:results += [PSCustomObject]@{ Test=$TestName; Expected=$Expected; Status="EXCEPTION"; Email=$Email }
    }
}

# =============================================================================
# SECTION 1 — OPEN-ENROLLMENT WITH DOCUMENTS (should be ELIGIBLE)
# All institute / certificate / associate applicants who submit HS docs.
# =============================================================================

Send-Application `
    -TestName    "1-A  Certificate — Liderazgo Espiritual with HS docs" `
    -Expected    "ELIGIBLE" `
    -Email       "carlos.mendoza.logos26@gmail.com" `
    -FirstName   "Carlos" -LastName "Mendoza" `
    -Phone       "7865550101" `
    -Church      "Iglesia de Dios Pentecostal El Shaddai" `
    -Pastor      "Rev. Miguel Fuentes" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Liderazgo Espiritual / Diplomado"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "2"; "AniosMinisterioAsociado" = "5" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "1-B  Associate of Biblical Studies with HS docs" `
    -Expected    "ELIGIBLE" `
    -Email       "maria.rodriguez.logos26@gmail.com" `
    -FirstName   "Mar${i_acute}a" -LastName "Rodr${i_acute}guez" `
    -Phone       "7865550102" `
    -Church      "Centro Cristiano Fuente de Vida" `
    -Pastor      "Rev. Carlos Jim${e_acute}nez" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Biblical Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioAsociado" = "3" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "1-C  Associate of Christian Counseling with HS docs" `
    -Expected    "ELIGIBLE" `
    -Email       "jose.hernandez.logos26@gmail.com" `
    -FirstName   "Jos${e_acute}" -LastName "Hern${a_acute}ndez" `
    -Phone       "7865550103" `
    -Church      "Iglesia Bautista Nueva Esperanza" `
    -Pastor      "Rev. Roberto V${a_acute}squez" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Christian Counseling"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado" }

# =============================================================================
# SECTION 2 — OPEN-ENROLLMENT WITHOUT DOCUMENTS (should be NEEDS_REVIEW:document)
# New rule: even open-enrollment programs require HS transcript + diploma.
# =============================================================================

Send-Application `
    -TestName    "2-A  Certificate — Pastores, no HS docs submitted" `
    -Expected    "NEEDS_REVIEW:document — missing HS transcript + diploma" `
    -Email       "ana.garcia.logos26@gmail.com" `
    -FirstName   "Ana" -LastName "Garc${i_acute}a" `
    -Phone       "7865550104" `
    -Church      "Templo Evangelico Monte Sinai" `
    -Pastor      "Rev. Luis Torres" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Pastores"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = ""
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName    "2-B  Associate of Pastoral Studies, no HS docs submitted" `
    -Expected    "NEEDS_REVIEW:document — missing HS transcript + diploma" `
    -Email       "roberto.martinez.logos26@gmail.com" `
    -FirstName   "Roberto" -LastName "Mart${i_acute}nez" `
    -Phone       "7865550105" `
    -Church      "Iglesia Cristiana Misionera Ebenezer" `
    -Pastor      "Rev. Andres Padilla" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Pastoral Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = ""
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName    "2-C  Associate of Theological Studies, only diploma (missing transcript)" `
    -Expected    "NEEDS_REVIEW:document — missing HS transcript" `
    -Email       "luisa.perez.logos26@gmail.com" `
    -FirstName   "Luisa" -LastName "P${e_acute}rez" `
    -Phone       "7865550106" `
    -Church      "Asamblea de Dios Bethel" `
    -Pastor      "Rev. Fernando Castro" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Theological Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria" }

# =============================================================================
# SECTION 3 — BACHELOR PROGRAMS (auto-approve and reject cases)
# =============================================================================

Send-Application `
    -TestName    "3-A  Bachelor of Theology — bachelor degree + all docs (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "fernando.gonzalez.logos26@gmail.com" `
    -FirstName   "Fernando" -LastName "Gonz${a_acute}lez" `
    -Phone       "7865550107" `
    -Church      "Iglesia El Calvario Assemblies of God" `
    -Pastor      "Rev. Pedro Reyes" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "8" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "3-B  Bachelor of Christian Education — some college + docs (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "elena.torres.logos26@gmail.com" `
    -FirstName   "Elena" -LastName "Torres" `
    -Phone       "7865550108" `
    -Church      "Ministerios Vida Nueva Internacional" `
    -Pastor      "Rev. Hector Morales" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Christian Education"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "3-C  Bachelor of Biblical Studies — high school only, no college (AI: life experience)" `
    -Expected    "NEEDS_REVIEW:ai — life experience review needed" `
    -Email       "miguel.castillo.logos26@gmail.com" `
    -FirstName   "Miguel" -LastName "Castillo" `
    -Phone       "7865550109" `
    -Church      "Tabern${a_acute}culo de Adoracion El Rey de Reyes" `
    -Pastor      "Rev. Samuel Lozano" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Biblical Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Associate"                    = "No tengo estudios universitarios"
        "Licenciatura"                 = "No tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "12"; "AniosMinisterioAsociado" = "3" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Diploma de Escuela Secundaria,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "3-D  Bachelor of Pastoral Studies — bachelor degree but missing docs (document flag)" `
    -Expected    "NEEDS_REVIEW:document — missing transcripts" `
    -Email       "sofia.ramirez.logos26@gmail.com" `
    -FirstName   "Sof${i_acute}a" -LastName "Ram${i_acute}rez" `
    -Phone       "7865550110" `
    -Church      "Centro de Fe y Esperanza" `
    -Pastor      "Rev. Alejandro Guzman" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Pastoral Studies"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura" }

# =============================================================================
# SECTION 4 — MASTER PROGRAMS (auto-approve, auto-reject, AI edge cases)
# =============================================================================

Send-Application `
    -TestName    "4-A  Master of Divinity — bachelor + all docs (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "pedro.jimenez.logos26@gmail.com" `
    -FirstName   "Pedro" -LastName "Jim${e_acute}nez" `
    -Phone       "7865550111" `
    -Church      "Primera Iglesia Bautista Hispana" `
    -Pastor      "Rev. Marcos Serrano" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "6" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "4-B  Master of Christian Counseling — bachelor + missing undergrad diploma (document flag)" `
    -Expected    "NEEDS_REVIEW:document — missing undergrad diploma" `
    -Email       "carmen.lopez.logos26@gmail.com" `
    -FirstName   "Carmen" -LastName "L${o_acute}pez" `
    -Phone       "7865550112" `
    -Church      "Iglesia Cristiana Shalom" `
    -Pastor      "Rev. Daniel Vargas" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Christian Counseling"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "4-C  Master of Theology — high school only, 0 ministry yrs (auto-reject)" `
    -Expected    "INELIGIBLE — below bachelor, no ministerial exception" `
    -Email       "andres.morales.logos26@gmail.com" `
    -FirstName   "Andr${e_acute}s" -LastName "Morales" `
    -Phone       "7865550113" `
    -Church      "Iglesia Casa de Oracion Miramar" `
    -Pastor      "Rev. Victor Salinas" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Theology (M.Th)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "2" } `
    -Form3Fields @{}

Send-Application `
    -TestName    "4-D  Master of Divinity — associate degree + 4yr FT (just below 5yr threshold, auto-reject)" `
    -Expected    "INELIGIBLE — 4yr FT is below 5yr minimum exception threshold" `
    -Email       "patricia.vasquez.logos26@gmail.com" `
    -FirstName   "Patricia" -LastName "V${a_acute}squez" `
    -Phone       "7865550114" `
    -Church      "Iglesia Luz del Mundo Hialeah" `
    -Pastor      "Rev. Ernesto Blanco" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "4" } `
    -Form3Fields @{ "ministerial_years_fulltime" = "4" }

Send-Application `
    -TestName    "4-E  Master of Christian Education — associate + 5yr FT (at threshold, AI edge case)" `
    -Expected    "NEEDS_REVIEW:ai — 5yr FT meets exception threshold" `
    -Email       "ricardo.flores.logos26@gmail.com" `
    -FirstName   "Ricardo" -LastName "Flores" `
    -Phone       "7865550115" `
    -Church      "Comunidad Cristiana Hosanna" `
    -Pastor      "Rev. Guillermo Mendez" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Christian Education"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "5" } `
    -Form3Fields @{ "ministerial_years_fulltime" = "5" }

Send-Application `
    -TestName    "4-F  Master of Theological Studies — associate + 9yr associated (below 10yr threshold, auto-reject)" `
    -Expected    "INELIGIBLE — 9yr associated is below 10yr minimum exception threshold" `
    -Email       "valentina.cruz.logos26@gmail.com" `
    -FirstName   "Valentina" -LastName "Cruz" `
    -Phone       "7865550116" `
    -Church      "Iglesia Resurreccion y Vida" `
    -Pastor      "Rev. Francisco Soto" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Theological Studies (M.Ths)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioAsociado" = "9" } `
    -Form3Fields @{ "ministerial_years_associated" = "9" }

Send-Application `
    -TestName    "4-G  Master of Leadership — associate + 10yr associated (at threshold, AI edge case)" `
    -Expected    "NEEDS_REVIEW:ai — 10yr associated meets exception threshold" `
    -Email       "gabriel.rios.logos26@gmail.com" `
    -FirstName   "Gabriel" -LastName "R${i_acute}os" `
    -Phone       "7865550117" `
    -Church      "Misi${o_acute}n Evangelistica Internacional Alfa y Omega" `
    -Pastor      "Rev. H${e_acute}ctor Medina" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Leadership $([char]38) Organization"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioAsociado" = "10" } `
    -Form3Fields @{ "ministerial_years_associated" = "10" }

# =============================================================================
# SECTION 5 — DOCTORATE PROGRAMS (all cases including new hard floor)
# =============================================================================

Send-Application `
    -TestName    "5-A  Doctor of Ministry — master degree + all docs (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "isabela.santos.logos26@gmail.com" `
    -FirstName   "Isabela" -LastName "Santos" `
    -Phone       "7865550118" `
    -Church      "Iglesia de la Comunidad Cristiana Palabra Viva" `
    -Pastor      "Rev. Joaqu${i_acute}n Navarro" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "15" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "5-B  Doctor of Christian Education — master + all docs (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "nicolas.guerrero.logos26@gmail.com" `
    -FirstName   "Nicol${a_acute}s" -LastName "Guerrero" `
    -Phone       "7865550119" `
    -Church      "Centro Familiar Cristiano Roca de Salvaci${o_acute}n" `
    -Pastor      "Rev. Mauricio Paredes" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Christian Education"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "20" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "5-C  Doctor of Theology — associate degree, 10yr FT (NEW HARD FLOOR: auto-reject)" `
    -Expected    "INELIGIBLE — associate degree is below bachelor floor for doctorate" `
    -Email       "catalina.mendez.logos26@gmail.com" `
    -FirstName   "Catalina" -LastName "M${e_acute}ndez" `
    -Phone       "7865550120" `
    -Church      "Iglesia Pentecostal Unida Latinoamerica" `
    -Pastor      "Rev. Ernesto Fuentes" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Theology (Th.D)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "10" } `
    -Form3Fields @{ "ministerial_years_fulltime" = "10" }

Send-Application `
    -TestName    "5-D  Doctor of Ministry — high school only, 0yr ministry (auto-reject)" `
    -Expected    "INELIGIBLE — high school is below bachelor floor for doctorate" `
    -Email       "rodrigo.silva.logos26@gmail.com" `
    -FirstName   "Rodrigo" -LastName "Silva" `
    -Phone       "7865550121" `
    -Church      "Iglesia Evangelica Vida Abundante" `
    -Pastor      "Rev. Cesar Aguilar" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName    "5-E  Doctor of Christian Counseling — bachelor + 9yr assoc (below threshold, auto-reject)" `
    -Expected    "INELIGIBLE — 9yr associated is below 20yr exception for doctorate" `
    -Email       "alejandra.rojas.logos26@gmail.com" `
    -FirstName   "Alejandra" -LastName "Rojas" `
    -Phone       "7865550122" `
    -Church      "Comunidad de Fe Maranatha" `
    -Pastor      "Rev. David Herrera" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Christian Counseling"
        "Licenciatura"                 = "Si tengo"
    } `
    -Form2Fields @{ "AniosMinisterioAsociado" = "9" } `
    -Form3Fields @{ "ministerial_years_associated" = "9" }

Send-Application `
    -TestName    "5-F  Doctor of Ministry — bachelor + 10yr FT ministry (AI edge case: needs exception review)" `
    -Expected    "NEEDS_REVIEW:ai — bachelor + 10yr FT meets exception threshold for doctorate" `
    -Email       "diego.contreras.logos26@gmail.com" `
    -FirstName   "Diego" -LastName "Contreras" `
    -Phone       "7865550123" `
    -Church      "Iglesia Cristiana Bethesda" `
    -Pastor      "Rev. Pablo Ibarra" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "10" } `
    -Form3Fields @{
        "ministerial_years_fulltime" = "10"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    }

Send-Application `
    -TestName    "5-G  Doctor of Ministry — bachelor + 20yr associated ministry (AI edge case)" `
    -Expected    "NEEDS_REVIEW:ai — bachelor + 20yr associated meets exception threshold for doctorate" `
    -Email       "lorena.espinoza.logos26@gmail.com" `
    -FirstName   "Lorena" -LastName "Espinoza" `
    -Phone       "7865550124" `
    -Church      "Iglesia Tabern${a_acute}culo de la Fe" `
    -Pastor      "Rev. Juan Delgado" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioAsociado" = "20" } `
    -Form3Fields @{
        "ministerial_years_associated" = "20"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    }

Send-Application `
    -TestName    "5-H  Doctor of Theology — missing undergrad diploma (document flag, despite master degree)" `
    -Expected    "NEEDS_REVIEW:document — missing undergrad diploma" `
    -Email       "beatriz.luna.logos26@gmail.com" `
    -FirstName   "Beatriz" -LastName "Luna" `
    -Phone       "7865550125" `
    -Church      "Iglesia Metodista Libre El Buen Pastor" `
    -Pastor      "Rev. Antonio Acosta" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Theology (Th.D)"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Transcripts - Registros oficiales de Notas de grado" }

# =============================================================================
# SECTION 6 — PhD PROGRAM
# =============================================================================

Send-Application `
    -TestName    "6-A  PhD — holds existing Th.D (auto-approve)" `
    -Expected    "ELIGIBLE" `
    -Email       "manuel.delgado.logos26@gmail.com" `
    -FirstName   "Manuel" -LastName "Delgado" `
    -Phone       "7865550126" `
    -Church      "Seminario Teol${o_acute}gico Hispano de las Asambleas" `
    -Pastor      "Dr. Eduardo S${a_acute}nchez" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Religious Philosophy (Ph.D)"
        "Doctorado"                    = "Si tengo"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{ "AniosMinisterioTiempoCompleto" = "25" } `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "6-B  PhD — no existing doctorate (auto-reject)" `
    -Expected    "INELIGIBLE — PhD requires existing Th.D or D.Min" `
    -Email       "natalia.rios.logos26@gmail.com" `
    -FirstName   "Natalia" -LastName "R${i_acute}os" `
    -Phone       "7865550127" `
    -Church      "Iglesia Cristiana Nuevo Horizonte" `
    -Pastor      "Rev. Carlos Ponce" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Religious Philosophy (Ph.D)"
        "Doctorado"                    = "No tengo un doctorado todavia"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

# =============================================================================
# SECTION 7 — FINANCIAL FLAGS
# =============================================================================

Send-Application `
    -TestName    "7-A  Master of Divinity — medium budget (\$50-100) applied (financial flag)" `
    -Expected    "NEEDS_REVIEW:financial — budget tier medium, graduate requires high" `
    -Email       "samuel.ortega.logos26@gmail.com" `
    -FirstName   "Samuel" -LastName "Ortega" `
    -Phone       "7865550128" `
    -Church      "Iglesia Pentecostal Arca de Salvaci${o_acute}n" `
    -Pastor      "Rev. Rafael Quiroz" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "BudgetsPresupuesto"           = "50 USD - 100 USD"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "7-B  Doctor of Ministry — low budget (\$25) applying for doctorate (financial flag)" `
    -Expected    "NEEDS_REVIEW:financial — budget tier low, doctorate requires high" `
    -Email       "claudia.vargas.logos26@gmail.com" `
    -FirstName   "Claudia" -LastName "Vargas" `
    -Phone       "7865550129" `
    -Church      "Misi${o_acute}n Luz a las Naciones" `
    -Pastor      "Rev. Benigno Ramos" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "BudgetsPresupuesto"           = "25 USD - 50 USD"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

Send-Application `
    -TestName    "7-C  Bachelor of Theology — low budget (\$25), has full docs (financial flag)" `
    -Expected    "NEEDS_REVIEW:financial — budget tier low, bachelor requires medium" `
    -Email       "teresa.aguilar.logos26@gmail.com" `
    -FirstName   "Teresa" -LastName "Aguilar" `
    -Phone       "7865550130" `
    -Church      "Iglesia Nueva Vida en Cristo" `
    -Pastor      "Rev. Jorge P${e_acute}rez" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "BudgetsPresupuesto"           = "25 USD - 50 USD"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado" }

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "SUBMISSION SUMMARY" -ForegroundColor White
Write-Host "  Sent OK : $passed" -ForegroundColor Green
Write-Host "  Errors  : $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "EXPECTED OUTCOMES (verify in dashboard after ~30s):" -ForegroundColor Yellow
Write-Host ""
$script:results | Format-Table -AutoSize Test, Expected, Status
Write-Host ""
Write-Host "Sections covered:" -ForegroundColor Cyan
Write-Host "  1  Open-enrollment WITH docs (Eligible)" -ForegroundColor White
Write-Host "  2  Open-enrollment WITHOUT docs (Needs Review: document — NEW RULE)" -ForegroundColor White
Write-Host "  3  Bachelor cases (eligible, AI life-exp, doc flag)" -ForegroundColor White
Write-Host "  4  Master cases (eligible, reject, AI 5yr/10yr thresholds, doc flag)" -ForegroundColor White
Write-Host "  5  Doctorate cases (eligible, hard floor associate=reject, AI 10yr/20yr)" -ForegroundColor White
Write-Host "  6  PhD (eligible with Th.D, reject without)" -ForegroundColor White
Write-Host "  7  Financial flags (low/medium budget mismatches)" -ForegroundColor White
Write-Host ""
Write-Host "Total tests: $($passed + $failed)" -ForegroundColor Cyan
