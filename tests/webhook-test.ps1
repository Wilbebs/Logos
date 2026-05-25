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

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "All tests sent. Check Railway logs and Supabase for results." -ForegroundColor Green
Write-Host ""
