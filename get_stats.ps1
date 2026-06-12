$IncludeExtensions = @(".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md", ".html")
$ExcludeFolders = @(".git", ".next", "node_modules", "public", ".claude", "certs", ".gemini", "dist", "build")

$Files = Get-ChildItem -File -Recurse | Where-Object { 
    $path = $_.FullName
    $ext = $_.Extension
    
    $includeExt = $IncludeExtensions -contains $ext
    if (-not $includeExt) { return $false }

    $exclude = $false
    foreach ($folder in $ExcludeFolders) {
        if ($path -match "[\\/]$folder[\\/]" -or $path -match "[\\/]$folder$") {
            $exclude = $true
            break
        }
    }
    return (-not $exclude)
}

$TotalFiles = $Files.Count
$TotalLines = 0
foreach ($f in $Files) {
    try {
        $lines = (Get-Content -LiteralPath $f.FullName | Measure-Object -Line).Lines
        $TotalLines += $lines
    } catch {
        # Ignore errors
    }
}

Write-Host "Total Code Files: $TotalFiles"
Write-Host "Total Lines of Code: $TotalLines"

# Now generate a clean tree structure for the code files
$Files | Select-Object -ExpandProperty FullName | Out-File "project_files.txt"

