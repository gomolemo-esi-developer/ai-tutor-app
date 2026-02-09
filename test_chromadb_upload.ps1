# Test ChromaDB Upload & Verification Script (PowerShell)
# Usage: .\test_chromadb_upload.ps1 -RagUrl "https://tutorverse-rag.onrender.com" -DocumentPath "C:\path\to\document.pdf"

param(
    [Parameter(Mandatory=$false)]
    [string]$RagUrl = "https://tutorverse-rag.onrender.com",
    
    [Parameter(Mandatory=$true)]
    [string]$DocumentPath
)

# Validation
if (-not (Test-Path $DocumentPath)) {
    Write-Host "Error: Document not found at $DocumentPath" -ForegroundColor Red
    exit 1
}

# Trim trailing slash
$RagUrl = $RagUrl.TrimEnd('/')

# Get file info
$File = Get-Item $DocumentPath
$FileName = $File.Name
$FileSize = "{0:N2} MB" -f ($File.Length / 1MB)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ChromaDB Upload & Verification Test" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   RAG Service URL: $RagUrl"
Write-Host "   Document: $FileName"
Write-Host "   File Size: $FileSize"
Write-Host ""

# Step 1: Check service health
Write-Host "1️⃣  Checking RAG Service Health..." -ForegroundColor Yellow
try {
    $HealthResponse = Invoke-WebRequest -Uri "$RagUrl/health" -Method Get -ErrorAction SilentlyContinue
    if ($HealthResponse.StatusCode -eq 200 -or $HealthResponse.StatusCode -eq 404) {
        Write-Host "✅ Service is online (HTTP $($HealthResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "❌ Service returned HTTP $($HealthResponse.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Cannot reach RAG service at $RagUrl" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: List current documents
Write-Host "2️⃣  Listing Current Documents in Storage..." -ForegroundColor Yellow
try {
    $DocsResponse = Invoke-WebRequest -Uri "$RagUrl/educator/documents" -Method Get -ErrorAction Stop
    $Docs = $DocsResponse.Content | ConvertFrom-Json
    Write-Host "Current documents:"
    $Docs | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "Could not retrieve documents: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Upload document
Write-Host "3️⃣  Uploading Document..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on file size..."
Write-Host ""

try {
    # Prepare file for multipart upload
    $FileContent = [System.IO.File]::ReadAllBytes($DocumentPath)
    $FileStream = [System.IO.File]::OpenRead($DocumentPath)
    
    # Create HTTP client with custom handler to support streaming
    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    
    # Create multipart content
    $content = New-Object System.Net.Http.MultipartFormDataContent
    $fileContent = New-Object System.Net.Http.StreamContent($FileStream)
    $fileContent.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream")
    $content.Add($fileContent, "file", $FileName)
    
    # Upload with streaming response
    Write-Host "Uploading $FileName..." -ForegroundColor Cyan
    $uri = "$RagUrl/educator/upload"
    $task = $client.PostAsync($uri, $content)
    $response = $task.Result
    
    if ($response.StatusCode -eq 200) {
        $responseStream = $response.Content.ReadAsStreamAsync().Result
        $reader = New-Object System.IO.StreamReader($responseStream)
        
        $DocumentId = ""
        $ChunkCount = ""
        $TextLength = ""
        $FileType = ""
        $FinalStatus = ""
        
        Write-Host "Upload progress:" -ForegroundColor Green
        
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            
            try {
                $json = $line | ConvertFrom-Json
                
                # Extract values
                if ($json.document_id) { $DocumentId = $json.document_id }
                if ($json.chunks) { $ChunkCount = $json.chunks }
                if ($json.text_length) { $TextLength = $json.text_length }
                if ($json.file_type) { $FileType = $json.file_type }
                if ($json.status) { $FinalStatus = $json.status }
                
                # Display progress
                if ($json.progress -and $json.message) {
                    $percent = [Math]::Floor($json.progress / 5)
                    $bar = [string]::new('█', $percent) + [string]::new(' ', 20 - $percent)
                    Write-Host "   [$bar] $($json.progress)% - $($json.message)"
                }
            } catch {
                # Skip malformed JSON lines
            }
        }
        
        Write-Host ""
        
        if ($FinalStatus -eq "complete") {
            Write-Host "✅ Upload Successful" -ForegroundColor Green
            Write-Host "   Document ID: $DocumentId"
            Write-Host "   Chunks Created: $ChunkCount"
            Write-Host "   Text Length: $TextLength characters"
            Write-Host "   File Type: $FileType"
        } else {
            Write-Host "❌ Upload Failed - Status: $FinalStatus" -ForegroundColor Red
        }
        
        Write-Host ""
        
        # Step 4: Verify vectors
        if ($DocumentId) {
            Write-Host "4️⃣  Verifying Vectors in ChromaDB..." -ForegroundColor Yellow
            
            try {
                $VerifyResponse = Invoke-WebRequest -Uri "$RagUrl/educator/verify/$DocumentId" -Method Get
                $VerifyJson = $VerifyResponse.Content | ConvertFrom-Json
                
                if ($VerifyJson.vectorsStored) {
                    Write-Host "✅ Vectors Successfully Stored" -ForegroundColor Green
                    Write-Host "   Vector Count: $($VerifyJson.vectorCount)"
                    Write-Host "   Status: $($VerifyJson.status)"
                } else {
                    Write-Host "⚠️  No vectors found in ChromaDB" -ForegroundColor Yellow
                    Write-Host "   This might indicate a storage issue"
                    Write-Host "   Status: $($VerifyJson.status)"
                }
            } catch {
                Write-Host "Error verifying vectors: $_" -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "❌ Upload failed with HTTP $($response.StatusCode)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error during upload: $_" -ForegroundColor Red
    exit 1
} finally {
    if ($FileStream) { $FileStream.Dispose() }
    if ($client) { $client.Dispose() }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. If vectors are stored ✅, quiz generation should now work"
Write-Host "2. Upload more documents with the same script"
Write-Host "3. Test quiz generation in the TutorVerse interface"
Write-Host "4. Check Render dashboard for persistent disk mount at /app/chroma_db"
Write-Host ""
