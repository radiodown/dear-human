# Windows build/run entry point. Requires a C++20 toolchain, CMake and dxc.
$ErrorActionPreference = 'Stop'
$PlanDDirectory = $PSScriptRoot
$PlanDBuildDirectory = Join-Path $PlanDDirectory 'build-windows'
Get-Command cmake -ErrorAction Stop | Out-Null
Get-Command dxc -ErrorAction Stop | Out-Null
& cmake -S $PlanDDirectory -B $PlanDBuildDirectory
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& cmake --build $PlanDBuildDirectory --config Debug
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Push-Location $PlanDDirectory
try {
    & (Join-Path $PlanDBuildDirectory 'bin/dear-human-plan-d.exe') @args
    $PlanDExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $PlanDExitCode
