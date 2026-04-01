# android_build_and_collect_logs.ps1
# Script para sincronizar Capacitor, compilar o APK (assembleDebug), instalar (se dispositivo),
# e coletar logs filtrados (TcpClientPlugin / TcpClientService / CapacitorInit).
# Execute no PowerShell (Admin não é necessário).
# Uso: PowerShell -ExecutionPolicy Bypass -File .\android_build_and_collect_logs.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Output "Repo root: $root"

function Run-AndLog($cmd, $logPath) {
    Write-Output "\n=== Executando: $cmd" | Tee-Object -FilePath $logPath -Append
    $oldErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $nativeErrPrefVar = Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    $nativeErrPrefOld = $null
    if ($nativeErrPrefVar) {
        $nativeErrPrefOld = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }

    try {
        Invoke-Expression $cmd 2>&1 | Tee-Object -FilePath $logPath -Append
        if ($LASTEXITCODE -ne 0) {
            Write-Output "Comando retornou código ${LASTEXITCODE}: $cmd" | Tee-Object -FilePath $logPath -Append
        }
    } catch {
        Write-Output "Comando falhou: $cmd" | Tee-Object -FilePath $logPath -Append
    } finally {
        $ErrorActionPreference = $oldErrorActionPreference
        if ($nativeErrPrefVar) {
            $PSNativeCommandUseErrorActionPreference = $nativeErrPrefOld
        }
    }
}

function Test-CommandAvailable([string]$name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-ConnectedDeviceIds() {
    $lines = & adb devices 2>$null
    if (-not $lines) { return @() }

    $ids = @()
    foreach ($line in $lines) {
        if ($line -match "^(\S+)\s+device$") {
            $ids += $Matches[1]
        }
    }
    return $ids
}

Write-Output "1) Sincronizando Capacitor com Android..."
Run-AndLog "npm run cap:sync" "$root\cap_sync.log"

Write-Output "2) Compilando APK (assembleDebug)... (isso pode demorar)"
Push-Location "$root\android"
try {
    Run-AndLog ".\\gradlew.bat clean assembleDebug --no-daemon" "$root\android_assemble.log"

    if (Test-Path "$root\android\app\build\outputs\apk\debug\app-debug.apk") {
        Write-Output "APK gerado: $root\android\app\build\outputs\apk\debug\app-debug.apk"
    } else {
        Write-Output "APK NÃO encontrado em android\app\build\outputs\apk\debug\app-debug.apk" | Tee-Object -FilePath "$root\android_assemble.log" -Append
    }

    if (Test-CommandAvailable "adb") {
        Write-Output "3) Listando dispositivos adb..."
        & adb devices -l 2>&1 | Tee-Object -FilePath "$root\adb_devices.txt"
        Get-Content "$root\adb_devices.txt"

        $deviceIds = Get-ConnectedDeviceIds
        if ($deviceIds.Count -gt 0) {
            Write-Output "4) Tentando instalar no dispositivo via Gradle (installDebug)..."
            Run-AndLog ".\\gradlew.bat installDebug --no-daemon" "$root\android_install.log"

            $deviceId = $deviceIds[0]
            Write-Output "5) Coletando logs do dispositivo: $deviceId"
            & adb -s $deviceId logcat -c 2>&1 | Out-Null

            & adb -s $deviceId logcat -d -v time > "$root\full_log.txt" 2>&1
            Write-Output "Full log salvo em: $root\full_log.txt"

            try {
                & adb -s $deviceId logcat -d -v time | findstr /R "TcpClientPlugin TcpClientService CapacitorInit" > "$root\filtered_logs.txt" 2>&1
            } catch {
                Get-Content "$root\full_log.txt" | Select-String -Pattern 'TcpClientPlugin','TcpClientService','CapacitorInit' | Set-Content "$root\filtered_logs.txt"
            }

            if (Test-Path "$root\filtered_logs.txt") {
                Write-Output "Filtered logs (primeiras 200 linhas):"
                Get-Content "$root\filtered_logs.txt" -TotalCount 200
            } else {
                Write-Output "Nenhum log filtrado foi gerado (arquivo não encontrado)."
            }
        } else {
            Write-Output "4) Nenhum dispositivo conectado. Pulando installDebug e coleta de logcat para evitar travamento."
        }
    } else {
        Write-Output "3) ADB não encontrado no PATH. Pulando installDebug e coleta de logcat para evitar travamento."
    }
} finally {
    Pop-Location
}

Write-Output "\n--- RESUMO ---"
Write-Output "cap_sync.log => $root\cap_sync.log"
Write-Output "android_assemble.log => $root\android_assemble.log"
Write-Output "android_install.log => $root\android_install.log"
Write-Output "adb_devices.txt => $root\adb_devices.txt"
Write-Output "full_log.txt => $root\full_log.txt"
Write-Output "filtered_logs.txt => $root\filtered_logs.txt"
Write-Output "APK path: $root\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Output "\nSe algum passo falhar, cole aqui os arquivos de log listados acima (ou as últimas 200 linhas)."

