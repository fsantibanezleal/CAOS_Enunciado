<#
.SYNOPSIS
  Clone to a running site, a green gate, or a fresh artifact. One entry point, no guessing.

.DESCRIPTION
  Every task here is free and offline. The only thing in this repository that costs money is a
  sweep, and it is deliberately NOT in this script: it needs a key and a declared budget, and it is
  driven directly through `data-pipeline/sweep_run.py` so that nobody starts one by autocompleting
  a task name.

.PARAMETER Task
  setup    create the venv, install the offline lane, install the frontend and the gate
  dev      run the dev server at http://localhost:5173
  build    build the site into frontend/dist
  verify   build, then run the UI gate against it
  live     run the UI gate against the deployed origin
  check    everything: lint, every guard, the ledger re-derivation, and the method tests
  bake     re-verify the corpus and rewrite data/artifacts/ (solves twenty models; a few seconds)
  report   re-derive data/artifacts/gap-report.json from the committed ledger

.EXAMPLE
  .\run.ps1 setup
  .\run.ps1 verify
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('setup', 'dev', 'build', 'verify', 'live', 'check', 'bake', 'report')]
    [string]$Task = 'check'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'

function Assert-Venv {
    if (-not (Test-Path $python)) {
        throw "No virtual environment at .venv. Run: .\run.ps1 setup"
    }
}

function Invoke-Step {
    param([string]$Label, [scriptblock]$Body)
    Write-Host ""
    Write-Host "== $Label" -ForegroundColor Cyan
    & $Body
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

switch ($Task) {
    'setup' {
        Invoke-Step 'python virtual environment' {
            if (-not (Test-Path $python)) { python -m venv (Join-Path $root '.venv') }
            & $python -m pip install --upgrade pip --quiet
            & $python -m pip install -r (Join-Path $root 'requirements.txt') --quiet
        }
        Invoke-Step 'frontend dependencies' {
            Push-Location (Join-Path $root 'frontend'); npm ci; Pop-Location
        }
        Invoke-Step 'gate dependencies' {
            Push-Location (Join-Path $root 'tools\visual-verify'); npm ci; Pop-Location
        }
        Write-Host ""
        Write-Host "Ready. Next: .\run.ps1 dev   or   .\run.ps1 verify" -ForegroundColor Green
    }

    'dev' {
        Push-Location (Join-Path $root 'frontend'); npm run dev; Pop-Location
    }

    'build' {
        Push-Location (Join-Path $root 'frontend'); npm run build; Pop-Location
    }

    'verify' {
        Push-Location (Join-Path $root 'frontend'); npm run build; Pop-Location
        Push-Location (Join-Path $root 'tools\visual-verify'); node verify.mjs; Pop-Location
    }

    'live' {
        if (-not $env:VERIFY_BASE) { $env:VERIFY_BASE = 'https://enunciado.fasl-work.com' }
        Write-Host "Auditing $($env:VERIFY_BASE), not the local build." -ForegroundColor Yellow
        Push-Location (Join-Path $root 'tools\visual-verify'); node verify.mjs; Pop-Location
    }

    'check' {
        Assert-Venv
        Invoke-Step 'lint' { & $python -m ruff check data-pipeline scripts tests }
        Invoke-Step 'the committed artifacts are readable' { & $python scripts\check_artifacts.py }
        Invoke-Step 'the SDD gate' { & $python scripts\check_sdd.py }
        Invoke-Step 'VERSION agrees with the site footer' { & $python scripts\check_version.py }
        Invoke-Step 'the report agrees with the ledger' {
            $env:PYTHONPATH = 'data-pipeline'
            & $python data-pipeline\report.py --check
        }
        Invoke-Step 'the CI budget (ADR-0074)' { & $python scripts\check_ci_budget.py }
        Invoke-Step 'no em-dash, no emoji (ADR-0067)' { & $python scripts\check_content_standards.py }
        Invoke-Step 'the docs wiki is complete' { & $python scripts\check_docs.py }
        # The structural methods, proved over all twenty cases. Local only: ADR-0074 rule 3 keeps a
        # product's test suite out of CI, and this is the validation of record for those methods.
        Invoke-Step 'the structural methods hold on every case' {
            Push-Location (Join-Path $root 'frontend'); node tests\run.mjs; Pop-Location
        }
    }

    'bake' {
        Assert-Venv
        Write-Host "This solves twenty models. It calls no API and costs nothing." -ForegroundColor Yellow
        $env:PYTHONPATH = 'data-pipeline'
        & $python data-pipeline\bake.py
    }

    'report' {
        Assert-Venv
        $env:PYTHONPATH = 'data-pipeline'
        & $python data-pipeline\report.py
    }
}
