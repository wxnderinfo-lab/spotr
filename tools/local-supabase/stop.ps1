# Stopt de lokale testgateway (54321/54329), PostgREST en Next (3100).
foreach ($p in 54321, 54329, 54330, 3100) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
