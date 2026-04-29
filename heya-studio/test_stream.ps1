$json = '{"message":"hello","sessionId":null,"context":null}'
$headers = @{ "Content-Type" = "application/json" }
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/agent/chat/stream" -Method POST -Headers $headers -Body $json -TimeoutSec 15
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Body: $($response.Content)"
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
