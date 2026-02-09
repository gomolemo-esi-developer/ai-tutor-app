# Migrate Local ChromaDB Chunks to Render.com Persistent Disk

param(
    [Parameter(Mandatory=$false)]
    [string]$RagUrl = "https://tutorverse-rag.onrender.com",
    
    [Parameter(Mandatory=$false)]
    [string]$DocumentsDir = ".\RAG18Nov2025-1\data\input"
)

$RagUrl = $RagUrl.TrimEnd('/')

if (-not (Test-Path $DocumentsDir)) {
    Write-Host "Error: Documents directory not found: $DocumentsDir" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migrate Local ChromaDB to Render" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  RAG Service: $RagUrl"
Write-Host "  Documents Dir: $DocumentsDir"
Write-Host ""

$documents = Get-ChildItem -Path $DocumentsDir -File

if ($documents.Count -eq 0) {
    Write-Host "No documents found in $DocumentsDir" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($documents.Count) document(s):" -ForegroundColor Green
foreach ($doc in $documents) {
    $sizeMB = [Math]::Round($doc.Length / 1MB, 2)
    Write-Host "  - $($doc.Name) ($sizeMB MB)"
}
Write-Host ""

Write-Host "Starting upload..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0
$uploadedDocs = @()

foreach ($doc in $documents) {
    $fileName = $doc.Name
    $filePath = $doc.FullName
    $sizeMB = [Math]::Round($doc.Length / 1MB, 2)
    
    Write-Host "Uploading: $fileName ($sizeMB MB)" -ForegroundColor Yellow
    
    try {
        $FileStream = [System.IO.File]::OpenRead($filePath)
        $content = New-Object System.Net.Http.MultipartFormDataContent
        $fileContent = New-Object System.Net.Http.StreamContent($FileStream)
        $fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream")
        $content.Add($fileContent, "file", $fileName)
        
        $handler = New-Object System.Net.Http.HttpClientHandler
        $client = New-Object System.Net.Http.HttpClient($handler)
        
        $uri = "$RagUrl/educator/upload"
        $task = $client.PostAsync($uri, $content)
        $response = $task.Result
        
        if ($response.StatusCode -eq 200) {
            $responseStream = $response.Content.ReadAsStreamAsync().Result
            $reader = New-Object System.IO.StreamReader($responseStream)
            
            $DocumentId = ""
            $ChunkCount = ""
            $FinalStatus = ""
            
            while (-not $reader.EndOfStream) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                
                try {
                    $json = $line | ConvertFrom-Json
                    if ($json.document_id) { $DocumentId = $json.document_id }
                    if ($json.chunks) { $ChunkCount = $json.chunks }
                    if ($json.status) { $FinalStatus = $json.status }
                } catch { }
            }
            
            if ($FinalStatus -eq "complete" -and $ChunkCount) {
                Write-Host "  SUCCESS: $ChunkCount chunks indexed" -ForegroundColor Green
                $uploadedDocs += @{
                    Name = $fileName
                    DocumentId = $DocumentId
                    Chunks = $ChunkCount
                }
                $successCount++
            } else {
                Write-Host "  WARNING: Status=$FinalStatus" -ForegroundColor Yellow
                $failCount++
            }
        } else {
            Write-Host "  FAILED: HTTP $($response.StatusCode)" -ForegroundColor Red
            $failCount++
        }
        
        $FileStream.Dispose()
        $client.Dispose()
        
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($uploadedDocs.Count -gt 0) {
    Write-Host "Uploaded Documents:" -ForegroundColor Green
    Write-Host ""
    
    foreach ($doc in $uploadedDocs) {
        Write-Host "  Name: $($doc.Name)"
        Write-Host "  ID: $($doc.DocumentId)"
        Write-Host "  Chunks: $($doc.Chunks)"
        Write-Host ""
    }
    
    Write-Host "Verify with:" -ForegroundColor Yellow
    foreach ($doc in $uploadedDocs) {
        Write-Host "  curl `"$RagUrl/educator/verify/$($doc.DocumentId)`""
    }
    
    Write-Host ""
    Write-Host "SUCCESS: Chunks migrated to Render disk!" -ForegroundColor Green
    Write-Host "Quiz/Chat now use online chunks from Render" -ForegroundColor Green
}
