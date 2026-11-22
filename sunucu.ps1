# Kitap Notlarım - bilgisayarda yerel olarak çalıştırmak için küçük web sunucusu.
# Kullanım: Baslat.bat dosyasına çift tıklayın. Pencere açık kaldığı sürece uygulama çalışır.
param([int]$Port = 8765, [switch]$NoBrowser)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch { Write-Host "Port $Port kullanımda. Uygulama zaten açık olabilir." -ForegroundColor Yellow; if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }; exit }
Write-Host "Kitap Notlarım çalışıyor: http://localhost:$Port/" -ForegroundColor Green
Write-Host "Kapatmak için bu pencereyi kapatın."
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
  $file = [IO.Path]::GetFullPath((Join-Path $root $path))
  $res = $ctx.Response
  if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.Headers.Add('Cache-Control', 'no-cache')
    $bytes = [IO.File]::ReadAllBytes($file)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }
  $res.Close()
}
