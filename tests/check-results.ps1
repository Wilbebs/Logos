# LOGOS Admissions - Test Results Checker
# Run after webhook-test.ps1 to verify eligibility engine output
# Usage: powershell -ExecutionPolicy Bypass -File tests\check-results.ps1

$SUPABASE_URL = "https://gxladdqkzvujuhwnrppl.supabase.co"
$SUPABASE_KEY = "sb_publishable_xxsZCGI6U3QJx2_4Km4F6g_gaQ2X5Hg"

$headers = @{
    "apikey"        = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type"  = "application/json"
}

# Expected results for each test email
$expected = @{
    "test-institute@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Certificate" }
    "test-associate@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Associate" }
    "test-bachelor-approve@logos.edu"= @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Bachelor" }
    "test-master-approve@logos.edu"  = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Master" }
    "test-phd-reject@logos.edu"      = @{ status = "ineligible";    ai = $null;      label = "AUTO-REJECT: PhD" }
    "test-master-reject@logos.edu"   = @{ status = "ineligible";    ai = $null;      label = "AUTO-REJECT: Master (no edu)" }
    "test-financial-flag@logos.edu"  = @{ status = "needs_review";  ai = "escalate"; label = "FINANCIAL FLAG" }
    "test-doc-flag@logos.edu"        = @{ status = "needs_review";  ai = "escalate"; label = "DOCUMENT FLAG" }
    "test-ai-bachelor-hs@logos.edu"  = @{ status = "needs_review";  ai = "any";      label = "AI EDGE: Bachelor HS only" }
    "test-ai-master-assoc@logos.edu" = @{ status = "needs_review";  ai = "any";      label = "AI EDGE: Master + 5yr ministry" }
    "test-ai-doctorate-bach@logos.edu"=@{ status = "needs_review";  ai = "any";      label = "AI EDGE: Doctorate + 10yr ministry" }
    "test-ai-unknown-prog@logos.edu" = @{ status = "needs_review";  ai = "any";      label = "AI EDGE: Unknown program" }
    "test-phd-approve@logos.edu"     = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: PhD with doctorate" }
    "test-cert-cbs@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: CBS (Certificado)" }
    "test-cert-acelerado@logos.edu"  = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Programa Acelerado" }
    "test-cert-capellania@logos.edu" = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Capellania" }
    "test-cert-pastores@logos.edu"   = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Pastores" }
    "test-cert-coaching@logos.edu"   = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Coaching/Liderazgo" }
    # Associate programs
    "test-assoc-ats@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: ATS" }
    "test-assoc-acc@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: ACC" }
    "test-assoc-aps@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: APS" }
    # Bachelor programs
    "test-bach-bbs@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: BBS" }
    "test-bach-bts@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: BTS" }
    "test-bach-bce@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: BCE" }
    "test-bach-bcc@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: BCC" }
    "test-bach-bps@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: BPS" }
    # Master programs
    "test-mast-mcc@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: MCC" }
    "test-mast-mce@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: MCE" }
    "test-mast-mths@logos.edu"       = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: M.Ths" }
    "test-mast-mth@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: M.Th" }
    "test-mast-mlo@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: MLO" }
    # Doctorate programs
    "test-doc-dmin@logos.edu"        = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: D.Min (clean)" }
    "test-doc-dmin-lead@logos.edu"   = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: D.Min/Leadership" }
    "test-doc-thd@logos.edu"         = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: Th.D" }
    "test-doc-dcc@logos.edu"         = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: DCC" }
    "test-doc-dce@logos.edu"         = @{ status = "eligible";      ai = $null;      label = "AUTO-APPROVE: DCE" }
    # Financial flags
    "test-fin-low-assoc@logos.edu"   = @{ status = "needs_review";  ai = "escalate"; label = "FINANCIAL FLAG: Low budget + Associate" }
    "test-fin-med-mast@logos.edu"    = @{ status = "needs_review";  ai = "escalate"; label = "FINANCIAL FLAG: Medium budget + Master" }
    "test-fin-med-doc@logos.edu"     = @{ status = "needs_review";  ai = "escalate"; label = "FINANCIAL FLAG: Medium budget + Doctorate" }
    # Document flags (partial)
    "test-doc-bach-nodocs-t@logos.edu" = @{ status = "needs_review"; ai = "escalate"; label = "DOC FLAG: Bachelor missing transcripts" }
    "test-doc-mast-nodiploma@logos.edu"     = @{ status = "needs_review"; ai = "escalate"; label = "DOC FLAG: Master missing diploma" }
    # Auto-reject boundary cases
    "test-reject-mast-hs3yr@logos.edu"       = @{ status = "ineligible";   ai = $null;      label = "AUTO-REJECT: Master HS+3yr" }
    "test-reject-mast-assoc4yr@logos.edu"    = @{ status = "ineligible";   ai = $null;      label = "AUTO-REJECT: Master assoc+4yr" }
    "test-reject-mast-9yrassoc@logos.edu"    = @{ status = "ineligible";   ai = $null;      label = "AUTO-REJECT: Master assoc+9yr assoc" }
    "test-reject-doc-hs0yr@logos.edu"        = @{ status = "ineligible";   ai = $null;      label = "AUTO-REJECT: Doctorate HS+0yr" }
    "test-reject-doc-bach9yrassoc@logos.edu" = @{ status = "ineligible";   ai = $null;      label = "AUTO-REJECT: Doctorate bach+9yr assoc" }
    # AI edge cases (threshold boundaries)
    "test-edge-mast-10yrassoc@logos.edu"     = @{ status = "needs_review"; ai = "any";      label = "AI EDGE: Master assoc+10yr assoc" }
    "test-edge-doc-bach10yrassoc@logos.edu"  = @{ status = "needs_review"; ai = "any";      label = "AI EDGE: Doctorate bach+10yr assoc" }
    "test-edge-doc-assoc10yr@logos.edu"      = @{ status = "needs_review"; ai = "any";      label = "AI EDGE: Doctorate assoc+10yr ft" }
}

# Fetch all test applicants from Supabase
$query = "$SUPABASE_URL/rest/v1/applicants?email=like.test-*&select=email,eligibility_status,ai_recommendation,ai_reasoning,forms_complete"

try {
    $applicants = Invoke-RestMethod -Uri $query -Headers $headers -Method GET
} catch {
    Write-Host "ERROR: Could not reach Supabase. Check your key/URL." -ForegroundColor Red
    exit 1
}

if ($applicants.Count -eq 0) {
    Write-Host ""
    Write-Host "No test applicants found in Supabase." -ForegroundColor Yellow
    Write-Host "Run webhook-test.ps1 first, then re-run this script." -ForegroundColor Yellow
    exit 0
}

# Build a lookup by email
$byEmail = @{}
foreach ($a in $applicants) { $byEmail[$a.email] = $a }

# Print results table
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  LOGOS ELIGIBILITY ENGINE - TEST RESULTS" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$missing = 0

foreach ($email in $expected.Keys | Sort-Object) {
    $exp   = $expected[$email]
    $actual = $byEmail[$email]

    if (-not $actual) {
        Write-Host "  [MISSING]  $($exp.label)" -ForegroundColor DarkGray
        Write-Host "             $email - not found in Supabase (forms may not have completed)" -ForegroundColor DarkGray
        $missing++
        continue
    }

    $gotStatus = $actual.eligibility_status
    $gotAI     = $actual.ai_recommendation
    $complete  = $actual.forms_complete

    # Evaluate pass/fail
    $statusOk = ($gotStatus -eq $exp.status)
    $aiOk = $true
    if ($exp.ai -eq "escalate") { $aiOk = ($gotAI -eq "escalate") }
    elseif ($exp.ai -eq "any")  { $aiOk = ($null -ne $gotAI -and $gotAI -ne "") }

    $ok = $statusOk -and $aiOk

    if ($ok) {
        $icon  = "PASS"
        $color = "Green"
        $pass++
    } else {
        $icon  = "FAIL"
        $color = "Red"
        $fail++
    }

    Write-Host "  [$icon]  $($exp.label)" -ForegroundColor $color
    Write-Host "           Email:  $email" -ForegroundColor Gray

    # Status line
    if ($statusOk) {
        Write-Host "           Status: $gotStatus" -ForegroundColor Green
    } else {
        Write-Host "           Status: $gotStatus  (expected: $($exp.status))" -ForegroundColor Red
    }

    # AI recommendation (only show when relevant)
    if ($exp.ai) {
        if ($aiOk) {
            Write-Host "           AI Rec: $gotAI" -ForegroundColor Green
        } else {
            Write-Host "           AI Rec: $gotAI  (expected: $($exp.ai))" -ForegroundColor Red
        }
    }

    # Show AI reasoning snippet for edge cases
    if ($exp.ai -eq "any" -and $actual.ai_reasoning) {
        $snippet = $actual.ai_reasoning
        if ($snippet.Length -gt 120) { $snippet = $snippet.Substring(0, 120) + "..." }
        Write-Host "           Reason: $snippet" -ForegroundColor DarkCyan
    }

    if (-not $complete) {
        Write-Host "           WARNING: forms_complete = false (not all 3 forms received)" -ForegroundColor Yellow
    }

    Write-Host ""
}

# Summary
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY:  $pass passed  |  $fail failed  |  $missing missing" -ForegroundColor $(
    if ($fail -eq 0 -and $missing -eq 0) { "Green" } elseif ($fail -gt 0) { "Red" } else { "Yellow" }
)
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
