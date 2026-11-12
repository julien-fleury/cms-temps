$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-FnmWithoutWinget {
    Write-Host "La source winget est indisponible. Installation directe de fnm…" -ForegroundColor Yellow

    $fnmDirectory = Join-Path $env:LOCALAPPDATA 'fnm'
    $archivePath = Join-Path $env:TEMP 'fnm-windows.zip'
    New-Item -Path $fnmDirectory -ItemType Directory -Force | Out-Null

    Invoke-WebRequest `
        -Uri 'https://github.com/Schniz/fnm/releases/latest/download/fnm-windows.zip' `
        -OutFile $archivePath `
        -UseBasicParsing
    Expand-Archive -Path $archivePath -DestinationPath $fnmDirectory -Force

    $fnmExecutable = Get-ChildItem -Path $fnmDirectory -Filter 'fnm.exe' -File -Recurse |
        Select-Object -First 1
    if (-not $fnmExecutable) {
        throw "L'archive fnm a été téléchargée, mais fnm.exe est introuvable."
    }

    $fnmPath = $fnmExecutable.DirectoryName
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $pathEntries = @($userPath -split ';' | Where-Object { $_ })
    if ($fnmPath -notin $pathEntries) {
        [Environment]::SetEnvironmentVariable('Path', (($pathEntries + $fnmPath) -join ';'), 'User')
    }
    $env:Path = "$fnmPath;$env:Path"

    Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "La commande '$Command' a échoué avec le code $LASTEXITCODE."
    }
}

try {
    Set-Location (Split-Path -Parent $PSScriptRoot)

    Write-Step 'Vérification de Windows Package Manager'
    $wingetAvailable = [bool](Get-Command winget -ErrorAction SilentlyContinue)
    if (-not $wingetAvailable) {
        Write-Host 'winget est introuvable. Le téléchargement direct sera utilisé.' -ForegroundColor Yellow
    }

    Write-Step 'Installation du gestionnaire Node.js (fnm)'
    if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
        if ($wingetAvailable) {
            try {
                Invoke-Checked winget install --id Schniz.fnm --exact --silent --accept-package-agreements --accept-source-agreements
                Refresh-Path
            } catch {
                Write-Host "winget n'a pas pu installer fnm : $($_.Exception.Message)" -ForegroundColor Yellow
                Install-FnmWithoutWinget
            }
        } else {
            Install-FnmWithoutWinget
        }
    }

    $fnmCommand = Get-Command fnm -ErrorAction SilentlyContinue
    if (-not $fnmCommand) {
        $fnmLink = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\fnm.exe'
        if (Test-Path $fnmLink) {
            $env:Path = "$(Split-Path $fnmLink);$env:Path"
        } else {
            throw 'fnm a été installé mais reste introuvable. Redémarrez Windows puis relancez ce fichier.'
        }
    }

    Write-Step 'Installation et activation de Node.js 22'
    Invoke-Checked fnm install 22
    Invoke-Checked fnm default 22
    Invoke-Expression (& fnm env --shell powershell | Out-String)
    Invoke-Checked fnm use 22

    $nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
    if ($nodeMajor -ne 22) {
        throw "La version active de Node.js n'est pas la version 22."
    }
    Write-Host "Node.js $(& node --version) actif." -ForegroundColor Green

    Write-Step 'Installation de pnpm'
    Invoke-Checked npm install --global pnpm@latest
    Write-Host "pnpm $(& pnpm --version) actif." -ForegroundColor Green

    Write-Step 'Installation des dépendances de CMS Temps'
    Invoke-Checked pnpm install

    Write-Step 'Vérification du code TypeScript'
    Invoke-Checked pnpm run typecheck

    Write-Step 'Exécution des tests métier'
    Invoke-Checked pnpm test

    Write-Step "Création de l'installateur Windows 64 bits"
    Invoke-Checked pnpm run build -- --win --x64

    $releaseDirectory = Join-Path (Get-Location) 'release'
    $installer = Get-ChildItem -Path $releaseDirectory -Filter '*.exe' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $installer) {
        throw "La compilation est terminée, mais aucun installateur .exe n'a été trouvé dans '$releaseDirectory'."
    }

    Write-Host "`n============================================================" -ForegroundColor Green
    Write-Host ' Installateur Windows créé avec succès' -ForegroundColor Green
    Write-Host " $($installer.FullName)" -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Green

    Start-Process explorer.exe -ArgumentList "/select,`"$($installer.FullName)`""
    exit 0
} catch {
    Write-Host "`nERREUR : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Le détail technique est disponible ci-dessous :" -ForegroundColor DarkGray
    Write-Host $_ -ForegroundColor DarkGray
    exit 1
}
