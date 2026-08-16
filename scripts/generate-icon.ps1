Add-Type -AssemblyName System.Drawing

$width = 256
$height = 256
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.Clear([System.Drawing.Color]::Transparent)

# Background circle with VOOC brand blue color (#2563eb)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($bgBrush, 12, 12, 232, 232)

# Inner icon (T-shirt motif)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 10)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

# Points scaled for 256x256
$pts = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF 190, 75),
    (New-Object System.Drawing.PointF 154, 60),
    (New-Object System.Drawing.PointF 142, 80),
    (New-Object System.Drawing.PointF 114, 80),
    (New-Object System.Drawing.PointF 102, 60),
    (New-Object System.Drawing.PointF 66, 75),
    (New-Object System.Drawing.PointF 54, 95),
    (New-Object System.Drawing.PointF 60, 125),
    (New-Object System.Drawing.PointF 82, 130),
    (New-Object System.Drawing.PointF 82, 195),
    (New-Object System.Drawing.PointF 174, 195),
    (New-Object System.Drawing.PointF 174, 130),
    (New-Object System.Drawing.PointF 196, 125),
    (New-Object System.Drawing.PointF 202, 95)
)

$g.DrawPolygon($pen, $pts)

if (-not (Test-Path 'build')) {
    New-Item -ItemType Directory -Path 'build' | Out-Null
}

$bmp.Save('build/icon.png', [System.Drawing.Imaging.ImageFormat]::Png)

# Convert to ICO
$iconHandle = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$stream = [System.IO.File]::OpenWrite('build/icon.ico')
$icon.Save($stream)
$stream.Close()

$g.Dispose()
$bmp.Dispose()
$bgBrush.Dispose()
$pen.Dispose()

Write-Output "Successfully generated build/icon.png and build/icon.ico"
