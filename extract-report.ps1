$html = Get-Content "D:\Workspaces\CURSOR01\mosque-crm\frontend\playwright-report\index.html" -Raw
# Find template tag
$idx = $html.LastIndexOf('<template')
$endIdx = $html.LastIndexOf('</template>')
Write-Host "Template start: $idx, end: $endIdx, html length: $($html.Length)"

if ($idx -ge 0 -and $endIdx -gt $idx) {
    # Find end of opening tag
    $openEnd = $html.IndexOf('>', $idx)
    $content = $html.Substring($openEnd + 1, $endIdx - $openEnd - 1).Trim()
    Write-Host "Content length: $($content.Length)"
    Write-Host "First 200 chars:"
    Write-Host $content.Substring(0, [Math]::Min(200, $content.Length))
    
    # Strip data URI prefix if present
    if ($content.StartsWith('data:')) {
        $commaIdx = $content.IndexOf(',')
        $content = $content.Substring($commaIdx + 1)
    }
    
    try {
        $bytes = [Convert]::FromBase64String($content)
        [IO.File]::WriteAllBytes("D:\Workspaces\CURSOR01\mosque-crm\pw-report-data.zip", $bytes)
        Write-Host "Saved ZIP: $($bytes.Length) bytes"
        New-Item -ItemType Directory -Path "D:\Workspaces\CURSOR01\mosque-crm\pw-report-extracted" -Force | Out-Null
        Expand-Archive -Path "D:\Workspaces\CURSOR01\mosque-crm\pw-report-data.zip" -DestinationPath "D:\Workspaces\CURSOR01\mosque-crm\pw-report-extracted" -Force
        Write-Host "Files:"
        Get-ChildItem "D:\Workspaces\CURSOR01\mosque-crm\pw-report-extracted"
    } catch {
        Write-Host "Error: $_"
    }
}
