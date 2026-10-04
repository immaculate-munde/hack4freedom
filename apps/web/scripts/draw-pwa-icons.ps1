Add-Type -AssemblyName System.Drawing

function Save-PesaIcon {
  param(
    [int]$Size,
    [string]$OutFile,
    [double]$GlyphScale,
    [bool]$Maskable
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $teal = [System.Drawing.Color]::FromArgb(255, 13, 122, 115)
  $cream = [System.Drawing.Color]::FromArgb(255, 250, 248, 245)
  $tealBrush = New-Object System.Drawing.SolidBrush $teal
  $creamBrush = New-Object System.Drawing.SolidBrush $cream

  if ($Maskable) {
    $graphics.Clear($teal)
  } else {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $radius = [single]($Size * 10 / 32)
    $diameter = $radius * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $shape.AddArc([single]($Size - $diameter), 0, $diameter, $diameter, 270, 90)
    $shape.AddArc([single]($Size - $diameter), [single]($Size - $diameter), $diameter, $diameter, 0, 90)
    $shape.AddArc(0, [single]($Size - $diameter), $diameter, $diameter, 90, 90)
    $shape.CloseFigure()
    $graphics.FillPath($tealBrush, $shape)
    $shape.Dispose()
  }

  $scale = ($Size * $GlyphScale) / 32.0
  $origin = ($Size - (32.0 * $scale)) / 2.0

  function Draw-Leaf([double]$cx, [double]$cy, [double]$rx, [double]$ry, [single]$angle) {
    $state = $graphics.Save()
    $graphics.TranslateTransform([single]($origin + $cx * $scale), [single]($origin + $cy * $scale))
    $graphics.RotateTransform($angle)
    $width = [single]($rx * 2 * $scale)
    $height = [single]($ry * 2 * $scale)
    $graphics.FillEllipse($creamBrush, -$width / 2, -$height / 2, $width, $height)
    $graphics.Restore($state)
  }

  Draw-Leaf 12.2 13.4 3.1 4.8 -42
  Draw-Leaf 19.8 13.4 3.1 4.8 42

  $stemX = [single]($origin + 15.15 * $scale)
  $stemY = [single]($origin + 14.2 * $scale)
  $stemW = [single](1.7 * $scale)
  $stemH = [single](9 * $scale)
  $graphics.FillRectangle($creamBrush, $stemX, $stemY, $stemW, $stemH)

  $bitmap.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $creamBrush.Dispose()
  $tealBrush.Dispose()
  $bitmap.Dispose()
}

$public = Join-Path $PSScriptRoot "..\public"
Save-PesaIcon -Size 192 -OutFile (Join-Path $public "icon-192.png") -GlyphScale 1 -Maskable $false
Save-PesaIcon -Size 512 -OutFile (Join-Path $public "icon-512.png") -GlyphScale 1 -Maskable $false
Save-PesaIcon -Size 180 -OutFile (Join-Path $public "apple-touch-icon.png") -GlyphScale 1 -Maskable $false
Save-PesaIcon -Size 512 -OutFile (Join-Path $public "icon-maskable-512.png") -GlyphScale 0.62 -Maskable $true
Get-ChildItem $public -Filter "*.png" | Select-Object Name, Length
