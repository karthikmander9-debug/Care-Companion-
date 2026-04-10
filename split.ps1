$lines = Get-Content 'index (1).html' -Encoding UTF8
$lines[17..834] | Set-Content 'style.css' -Encoding UTF8
$lines[1127..1778] | Set-Content 'script.js' -Encoding UTF8
$html = @()
$html += $lines[0..15]
$html += '  <link rel="stylesheet" href="style.css">'
$html += $lines[836..1120]
$html += '  <script src="script.js"></script>'
$html += $lines[1780..1782]
$html | Set-Content 'index.html' -Encoding UTF8
