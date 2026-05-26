# LOGOS Admissions - Webhook Test Script
# Run in PowerShell: powershell -ExecutionPolicy Bypass -File webhook-test.ps1

$BASE_URL = "https://logos-production-c920.up.railway.app"
$SECRET   = "logos-webhook-2026"

function Send-Application {
    param(
        [string]$TestName,
        [string]$Email,
        [hashtable]$Form1Fields,
        [hashtable]$Form2Fields,
        [hashtable]$Form3Fields
    )

    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "TEST: $TestName" -ForegroundColor Yellow
    Write-Host "Email: $Email" -ForegroundColor Gray

    $f1 = @{
        "FirstNmeNombre"               = "Test"
        "LastNameApellido"             = "Applicant"
        "EmailICorreoElectronico"      = $Email
        "EmailICorreoElectrónicoI"     = $Email
        "PhoneMobileCelular"           = "3051234567"
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Biblical Studies"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Associate"                    = "No tengo estudios universitarios"
        "Licenciatura"                 = "No tengo"
        "Maestria"                     = "No tengo estudios de posgrado"
        "Doctorado"                    = "No tengo un doctorado todavia"
        "AQueDenominacionPertenece"    = "Pentecostal"
    }
    foreach ($k in $Form1Fields.Keys) { $f1[$k] = $Form1Fields[$k] }

    $f2 = @{
        "Nombre"            = "Pastor"
        "Apellido"          = "Test"
        "CorreoElectronico" = $Email
        "TelefonoCelular"   = "3051234567"
        "NombreDelPastor"   = "Rev. Test Pastor"
        "NombreDeLaIglesia" = "Iglesia Test"
    }
    foreach ($k in $Form2Fields.Keys) { $f2[$k] = $Form2Fields[$k] }

    $f3 = @{
        "Nombre"            = "Test"
        "Apellido"          = "Applicant"
        "CorreoElectronico" = $Email
        "TelefonoCelular"   = "3051234567"
        "NombreDeLaIglesia" = "Iglesia Test"
        "NombreDelPastor"   = "Rev. Test"
    }
    foreach ($k in $Form3Fields.Keys) { $f3[$k] = $Form3Fields[$k] }

    $sep = [char]38

    $parts1 = @()
    foreach ($k in $f1.Keys) { $parts1 += "$k=$([System.Uri]::EscapeDataString($f1[$k]))" }
    $body1 = $parts1 -join $sep

    $r1 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/1" -Method POST `
        -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
        -Body $body1 -UseBasicParsing
    Write-Host "Form 1: $($r1.StatusCode) - $($r1.Content)" -ForegroundColor $(if ($r1.StatusCode -eq 200) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500

    $parts2 = @()
    foreach ($k in $f2.Keys) { $parts2 += "$k=$([System.Uri]::EscapeDataString($f2[$k]))" }
    $body2 = $parts2 -join $sep

    $r2 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/2" -Method POST `
        -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
        -Body $body2 -UseBasicParsing
    Write-Host "Form 2: $($r2.StatusCode) - $($r2.Content)" -ForegroundColor $(if ($r2.StatusCode -eq 200) { "Green" } else { "Red" })

    Start-Sleep -Milliseconds 500

    $parts3 = @()
    foreach ($k in $f3.Keys) { $parts3 += "$k=$([System.Uri]::EscapeDataString($f3[$k]))" }
    $body3 = $parts3 -join $sep

    $r3 = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/3" -Method POST `
        -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
        -Body $body3 -UseBasicParsing
    Write-Host "Form 3: $($r3.StatusCode) - $($r3.Content)" -ForegroundColor $(if ($r3.StatusCode -eq 200) { "Green" } else { "Red" })
}

# =============================================================================
# SECTION 1 - RULE ENGINE ONLY (no AI triggered)
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: Instituto (open enrollment)" `
    -Email    "test-institute@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Liderazgo Espiritual / Diplomado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Associate (open enrollment)" `
    -Email    "test-associate@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Biblical Studies"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor with prior college" `
    -Email    "test-bachelor-approve@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Master with bachelor degree" `
    -Email    "test-master-approve@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-REJECT: PhD without existing doctorate" `
    -Email    "test-phd-reject@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Religious Philosophy (Ph.D)"
        "Doctorado"                    = "No tengo un doctorado todavia"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-REJECT: Master with no education and no experience" `
    -Email    "test-master-reject@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "FINANCIAL FLAG: Low budget applying for Bachelor" `
    -Email    "test-financial-flag@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "BudgetsPresupuesto"           = "25 USD - 50 USD"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "DOCUMENT FLAG: Master missing transcripts" `
    -Email    "test-doc-flag@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = ""
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 2 - AI TRIGGERED (edge cases)
# =============================================================================

Send-Application `
    -TestName "AI EDGE CASE: Bachelor with only high school (life experience)" `
    -Email    "test-ai-bachelor-hs@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AI EDGE CASE: Master with Associate + 5 yrs full-time ministry" `
    -Email    "test-ai-master-assoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
        "ministerial_years_fulltime"   = "5"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AI EDGE CASE: Doctorate with Bachelor + 10 yrs full-time ministry" `
    -Email    "test-ai-doctorate-bach@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_fulltime" = "10"
    }

Send-Application `
    -TestName "AI EDGE CASE: Unrecognized program name" `
    -Email    "test-ai-unknown-prog@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Programa Especial de Teologia Avanzada"
        "Licenciatura"                 = "Si tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 3 - ALL CERTIFICATE / INSTITUTE PROGRAMS (open enrollment)
# =============================================================================

# Accent helpers (avoids UTF-8/Windows-1252 encoding corruption in .ps1 files)
$i_acute = [char]237   # í
$e_acute = [char]233   # é

Send-Application `
    -TestName "AUTO-APPROVE: Certificado en Estudios Biblicos (CBS)" `
    -Email    "test-cert-cbs@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Certificado en Estudios B${i_acute}blicos"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Programa Acelerado Ministerial" `
    -Email    "test-cert-acelerado@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Programa Acelerado Ministerial"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Capellania" `
    -Email    "test-cert-capellania@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Capellan${i_acute}a"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Pastores" `
    -Email    "test-cert-pastores@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Pastores"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Coaching / Liderazgo Sistemico" `
    -Email    "test-cert-coaching@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Certificate - Certificado"
        "DesiredProgramProramaDeseado" = "Coaching / Liderazgo Sist${e_acute}mico"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 4 - ALL ASSOCIATE PROGRAMS (open enrollment)
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: Associate of Theological Studies (ATS)" `
    -Email    "test-assoc-ats@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Theological Studies"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Associate of Christian Counseling (ACC)" `
    -Email    "test-assoc-acc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Christian Counseling"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Associate of Pastoral Studies (APS)" `
    -Email    "test-assoc-aps@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Pastoral Studies"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 5 - ALL BACHELOR PROGRAMS (with prior college + docs)
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor of Biblical Studies (BBS)" `
    -Email    "test-bach-bbs@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Biblical Studies"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor of Theological Studies (BTS)" `
    -Email    "test-bach-bts@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theological Studies"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor of Christian Education (BCE)" `
    -Email    "test-bach-bce@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Christian Education"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor of Christian Counseling (BCC)" `
    -Email    "test-bach-bcc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Christian Counseling"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Bachelor of Pastoral Studies (BPS)" `
    -Email    "test-bach-bps@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Pastoral Studies"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 6 - ALL MASTER PROGRAMS (bachelor + docs)
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: Master of Christian Counseling (MCC)" `
    -Email    "test-mast-mcc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Christian Counseling"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Master of Christian Education (MCE)" `
    -Email    "test-mast-mce@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Christian Education"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Master of Theological Studies (M.Ths)" `
    -Email    "test-mast-mths@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Theological Studies (M.Ths)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Master of Theology (M.Th)" `
    -Email    "test-mast-mth@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Theology (M.Th)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Master of Leadership and Organization (MLO)" `
    -Email    "test-mast-mlo@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Leadership $([char]38) Organization"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 7 - ALL DOCTORATE PROGRAMS (masters + docs)
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: Doctor of Ministry (D.Min) - clean path" `
    -Email    "test-doc-dmin@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Doctor of Ministry / Leadership and Innovation" `
    -Email    "test-doc-dmin-lead@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry / Leadership $([char]38) Innovation"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Doctor of Theology (Th.D)" `
    -Email    "test-doc-thd@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Theology (Th.D)"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Doctor of Christian Counseling (DCC)" `
    -Email    "test-doc-dcc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Christian Counseling"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-APPROVE: Doctor of Christian Education (DCE)" `
    -Email    "test-doc-dce@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Christian Education"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 8 - FINANCIAL FLAGS (additional budget mismatch scenarios)
# =============================================================================

Send-Application `
    -TestName "FINANCIAL FLAG: Low budget applying for Associate" `
    -Email    "test-fin-low-assoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Associate - Tecnico Superior"
        "DesiredProgramProramaDeseado" = "Associate of Biblical Studies"
        "BudgetsPresupuesto"           = "25 USD - 50 USD"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "FINANCIAL FLAG: Medium budget applying for Master" `
    -Email    "test-fin-med-mast@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "BudgetsPresupuesto"           = "50 USD - 100 USD"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "FINANCIAL FLAG: Medium budget applying for Doctorate" `
    -Email    "test-fin-med-doc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "BudgetsPresupuesto"           = "50 USD - 100 USD"
        "Maestria"                     = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 9 - DOCUMENT FLAGS (partial - one doc missing at a time)
# =============================================================================

Send-Application `
    -TestName "DOCUMENT FLAG: Bachelor - has diploma, missing transcripts" `
    -Email    "test-doc-bach-notranscripts@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Bachelor - Licenciatura"
        "DesiredProgramProramaDeseado" = "Bachelor of Theology (B.Th)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "DOCUMENT FLAG: Master - has transcripts, missing undergrad diploma" `
    -Email    "test-doc-mast-nodiploma@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

# =============================================================================
# SECTION 10 - AUTO-REJECT BOUNDARY CASES
# =============================================================================

Send-Application `
    -TestName "AUTO-REJECT: Master - high school + 3yr ministry (below 5yr threshold)" `
    -Email    "test-reject-mast-hs3yr@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_fulltime" = "3"
    }

Send-Application `
    -TestName "AUTO-REJECT: Master - associate + 4yr ministry (below 5yr threshold)" `
    -Email    "test-reject-mast-assoc4yr@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_fulltime" = "4"
    }

Send-Application `
    -TestName "AUTO-REJECT: Master - associate + 9yr associated (below 10yr threshold)" `
    -Email    "test-reject-mast-9yrassoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_associated" = "9"
    }

Send-Application `
    -TestName "AUTO-REJECT: Doctorate - high school + 0yr ministry" `
    -Email    "test-reject-doc-hs0yr@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "CompletoSuEscuelaSecundaria"  = "SI"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "AUTO-REJECT: Doctorate - bachelor + 9yr associated (below 10 total threshold)" `
    -Email    "test-reject-doc-bach9yrassoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_associated" = "9"
    }

# =============================================================================
# SECTION 11 - AI EDGE CASES (threshold boundaries that trigger review)
# =============================================================================

Send-Application `
    -TestName "AI EDGE: Master - associate + 10yr associated (at threshold, no docs)" `
    -Email    "test-edge-mast-10yrassoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_associated" = "10"
    }

Send-Application `
    -TestName "AI EDGE: Doctorate - bachelor + 10yr associated (at 10 total threshold)" `
    -Email    "test-edge-doc-bach10yrassoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_associated" = "10"
    }

Send-Application `
    -TestName "AI EDGE: Doctorate - associate + 10yr fulltime (below masters, exception applies)" `
    -Email    "test-edge-doc-assoc10yr@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{
        "ministerial_years_fulltime" = "10"
    }

# =============================================================================
# SECTION 12 - BUG VALIDATION
# =============================================================================

Send-Application `
    -TestName "AUTO-APPROVE: PhD with existing doctorate" `
    -Email    "test-phd-approve@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Religious Philosophy (Ph.D)"
        "Doctorado"                    = "Si tengo"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "All tests sent. Check Railway logs and Supabase for results." -ForegroundColor Green
Write-Host ""
