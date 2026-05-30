# LOGOS - AI Edge Case Test (5 cases that trigger Gemini)
# Run: powershell -ExecutionPolicy Bypass -File tests\ai-test.ps1

$BASE_URL = "https://logos-production-c920.up.railway.app"
$SECRET   = "logos-webhook-2026"
$SUPABASE_URL = "https://gxladdqkzvujuhwnrppl.supabase.co"
$SUPABASE_KEY = "sb_publishable_xxsZCGI6U3QJx2_4Km4F6g_gaQ2X5Hg"

function Send-Application {
    param([string]$TestName, [string]$Email, [hashtable]$Form1Fields, [hashtable]$Form2Fields, [hashtable]$Form3Fields)

    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "TEST: $TestName" -ForegroundColor Yellow

    $sep = [char]38

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
    }
    foreach ($k in $Form1Fields.Keys) { $f1[$k] = $Form1Fields[$k] }

    $f2 = @{ "Nombre" = "Pastor"; "Apellido" = "Test"; "CorreoElectronico" = $Email; "TelefonoCelular" = "3051234567"; "NombreDelPastor" = "Rev. Test"; "NombreDeLaIglesia" = "Iglesia Test" }
    foreach ($k in $Form2Fields.Keys) { $f2[$k] = $Form2Fields[$k] }

    $f3 = @{ "Nombre" = "Test"; "Apellido" = "Applicant"; "CorreoElectronico" = $Email; "TelefonoCelular" = "3051234567"; "NombreDeLaIglesia" = "Iglesia Test"; "NombreDelPastor" = "Rev. Test" }
    foreach ($k in $Form3Fields.Keys) { $f3[$k] = $Form3Fields[$k] }

    foreach ($formNum in 1,2,3) {
        $fields = if ($formNum -eq 1) { $f1 } elseif ($formNum -eq 2) { $f2 } else { $f3 }
        $parts = @(); foreach ($k in $fields.Keys) { $parts += "$k=$([System.Uri]::EscapeDataString($fields[$k]))" }
        $body = $parts -join $sep
        try {
            $r = Invoke-WebRequest -Uri "$BASE_URL/webhook/machform/$formNum" -Method POST `
                -Headers @{ "Content-Type" = "application/x-www-form-urlencoded"; "X-Webhook-Secret" = $SECRET } `
                -Body $body -UseBasicParsing
            Write-Host "  Form $formNum`: $($r.StatusCode)" -ForegroundColor $(if ($r.StatusCode -eq 200) { "Green" } else { "Red" })
        } catch {
            Write-Host "  Form $formNum`: ERROR - $_" -ForegroundColor Red
        }
        Start-Sleep -Milliseconds 600
    }
}

# ── 5 AI edge cases ────────────────────────────────────────────────────────────

Send-Application `
    -TestName "AI EDGE: Bachelor - HS only (no college)" `
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
    -TestName "AI EDGE: Master - Associate + 5yr full-time ministry" `
    -Email    "test-ai-master-assoc@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Master of Divinity (M.Div)"
        "Associate"                    = "Si, complete el estudio"
        "Licenciatura"                 = "No tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "ministerial_years_fulltime" = "5" }

Send-Application `
    -TestName "AI EDGE: Doctorate - Bachelor + 10yr full-time ministry" `
    -Email    "test-ai-doctorate-bach@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Doctoral - Doctorado"
        "DesiredProgramProramaDeseado" = "Doctor of Ministry (D.Min)"
        "Licenciatura"                 = "Si tengo"
        "MarqueLosDocumentosQueEstaIncluyen" = "Copia de la Licenciatura,Transcripts - Registros oficiales de Notas de grado"
    } `
    -Form2Fields @{} `
    -Form3Fields @{ "ministerial_years_fulltime" = "10" }

Send-Application `
    -TestName "AI EDGE: Unknown program name" `
    -Email    "test-ai-unknown-prog@logos.edu" `
    -Form1Fields @{
        "StudyLevelsNivelesDeEstudio"  = "Master - Maestria"
        "DesiredProgramProramaDeseado" = "Programa Especial de Teologia Avanzada"
        "Licenciatura"                 = "Si tengo"
    } `
    -Form2Fields @{} `
    -Form3Fields @{}

Send-Application `
    -TestName "FINANCIAL FLAG: Low budget bachelor (escalate)" `
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

# ── Wait for AI calls to complete, then check results ─────────────────────────
Write-Host ""
Write-Host "Waiting 8s for Gemini to process..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$headers = @{ "apikey" = $SUPABASE_KEY; "Authorization" = "Bearer $SUPABASE_KEY" }
$emails  = @(
    "test-ai-bachelor-hs@logos.edu",
    "test-ai-master-assoc@logos.edu",
    "test-ai-doctorate-bach@logos.edu",
    "test-ai-unknown-prog@logos.edu",
    "test-financial-flag@logos.edu"
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AI TEST RESULTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

foreach ($email in $emails) {
    $url  = "$SUPABASE_URL/rest/v1/applicants?email=eq.$email&select=email,eligibility_status,ai_recommendation,ai_reasoning"
    $data = Invoke-RestMethod -Uri $url -Headers $headers -Method GET

    if ($data.Count -eq 0) {
        Write-Host "  [MISSING] $email" -ForegroundColor DarkGray
        continue
    }

    $a = $data[0]
    $hasAI = $a.ai_recommendation -ne $null -and $a.ai_recommendation -ne ""
    $color = if ($a.eligibility_status -eq "needs_review" -and $hasAI) { "Green" } else { "Red" }

    Write-Host ""
    Write-Host "  $email" -ForegroundColor White
    Write-Host "  Status:     $($a.eligibility_status)" -ForegroundColor $color
    Write-Host "  AI Rec:     $($a.ai_recommendation)" -ForegroundColor $color
    if ($a.ai_reasoning) {
        $snippet = if ($a.ai_reasoning.Length -gt 150) { $a.ai_reasoning.Substring(0,150) + "..." } else { $a.ai_reasoning }
        Write-Host "  Reasoning:  $snippet" -ForegroundColor DarkCyan
    }
}
Write-Host ""
