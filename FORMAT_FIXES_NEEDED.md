# Format Support Fixes Needed

## Current Status

✅ **Fixed (2026-02-19)**:
- Audio files (OOM crash)
- PowerPoint .pptx files
- PowerPoint .ppt files (now supported via LibreOffice)

⚠️ **Broken (Need Fixes)**:
- Word .doc files (old Microsoft Office format)
- Excel .xls files (old Microsoft Office format)
- Large scanned PDFs (memory issues)

❌ **Not Supported**:
- Encrypted PDFs
- Handwritten documents
- HEIC images (Apple format)

---

## Fix #1: Word .doc Support (PRIORITY: HIGH)

**Issue**: "Package not found" - Same problem as PowerPoint .ppt

**Root Cause**: python-docx only supports `.docx`, not old `.doc` format

**Solution**: Apply same fix as .ppt
```python
def _convert_docx(self, file_path: Path, callback: Optional[Callable] = None) -> str:
    # FIX (2026-02-19): Handle both .doc and .docx files
    if file_path.suffix.lower() == '.doc':
        # Convert .doc to .docx using LibreOffice
        libreoffice --headless --convert-to docx --outdir /tmp file.doc
        # Then process converted .docx
    else:
        # Process .docx directly
        doc = Document(str(file_path))
```

**Estimated Effort**: 30 minutes (copy from .ppt fix pattern)

**Test**:
```bash
Upload .doc file → Should see "Converting .doc to .docx"
Upload .docx file → Should work as before (no change)
```

---

## Fix #2: Excel .xls Support (PRIORITY: MEDIUM)

**Issue**: openpyxl doesn't support `.xls` (old binary format)

**Root Cause**: Modern libraries only support Open XML formats (.xlsx)

**Solution**: Convert .xls to .xlsx with LibreOffice
```python
def _convert_excel(self, file_path: Path, callback: Optional[Callable] = None) -> str:
    # FIX (2026-02-19): Handle both .xls and .xlsx files
    if file_path.suffix.lower() == '.xls':
        # Convert .xls to .xlsx using LibreOffice
        libreoffice --headless --convert-to xlsx --outdir /tmp file.xls
        # Then process converted .xlsx
    else:
        # Process .xlsx directly
        workbook = openpyxl.load_workbook(str(file_path))
```

**Estimated Effort**: 30 minutes (same pattern)

**Test**:
```bash
Upload .xls file → Should extract all sheets and cells
Upload .xlsx file → Should work as before
```

---

## Fix #3: Large Scanned PDF Optimization (PRIORITY: LOW)

**Issue**: Large scanned PDFs (50+ pages) can cause OOM

**Root Cause**: EasyOCR loads entire PDF into memory

**Solution**: Process PDF in chunks
```python
def _convert_pdf(self, file_path: Path, callback: Optional[Callable] = None) -> str:
    # FIX (2026-02-19): Handle large PDFs by processing in chunks
    from pdf2image import convert_from_path
    
    # Try fast path first (text extraction)
    try:
        return self._extract_pdf_text(file_path)  # < 5 seconds
    except:
        # Fall back to OCR with chunking
        images = convert_from_path(file_path)
        
        if len(images) > 20:
            # Large PDF - process in chunks
            return self._ocr_pdf_chunked(images, callback)
        else:
            # Small PDF - process all at once
            return self._ocr_pdf_simple(images, callback)

def _ocr_pdf_chunked(self, images, callback):
    """Process large PDFs in chunks to avoid OOM"""
    chunk_size = 10  # Process 10 pages at a time
    all_text = []
    
    for chunk_start in range(0, len(images), chunk_size):
        chunk_end = min(chunk_start + chunk_size, len(images))
        
        # Process chunk
        chunk_images = images[chunk_start:chunk_end]
        chunk_text = self._ocr_chunk(chunk_images)
        all_text.append(chunk_text)
        
        # Force cleanup
        del chunk_images
        gc.collect()
    
    return "\n".join(all_text)
```

**Estimated Effort**: 1-2 hours

**Test**:
```bash
Upload small PDF (10 pages) → Fast text extraction
Upload large PDF (100 pages) → Chunked OCR processing
Monitor memory → Should stay < 500MB
```

---

## Quick Fix Template

All three fixes follow the same pattern:

**Template**:
```python
def _convert_OLD_FORMAT(self, file_path: Path, callback: Optional[Callable] = None) -> str:
    # Check file extension
    if file_path.suffix.lower() == '.old':
        # FIX: Convert to new format
        try:
            import subprocess
            import tempfile
            
            with tempfile.TemporaryDirectory() as tmpdir:
                converted_path = Path(tmpdir) / f"{file_path.stem}.new"
                
                # Use LibreOffice to convert
                cmd = [
                    'libreoffice',
                    '--headless',
                    '--convert-to', 'new',  # Target format
                    '--outdir', str(tmpdir),
                    str(file_path)
                ]
                
                result = subprocess.run(cmd, capture_output=True, timeout=60)
                
                if result.returncode != 0:
                    # Fallback method
                    return self._extract_OLD_FORMAT_fallback(file_path, callback)
                
                # Process converted file
                return self._process_new_format(converted_path)
        
        except Exception as e:
            # Fallback method
            return self._extract_OLD_FORMAT_fallback(file_path, callback)
    
    else:
        # Process new format directly
        return self._process_new_format(file_path)
```

---

## Implementation Checklist

### Fix .doc Support
- [ ] Update `_convert_docx()` to detect `.doc`
- [ ] Add LibreOffice conversion logic
- [ ] Add fallback method
- [ ] Add error handling
- [ ] Test with real .doc files
- [ ] Update FILE_FORMAT_SUPPORT.md

### Fix .xls Support
- [ ] Update `_convert_excel()` to detect `.xls`
- [ ] Add LibreOffice conversion logic
- [ ] Add fallback method
- [ ] Add error handling
- [ ] Test with real .xls files
- [ ] Update FILE_FORMAT_SUPPORT.md

### Fix Large PDF Chunking
- [ ] Split OCR processing into chunks
- [ ] Add chunk size configurable
- [ ] Add memory cleanup between chunks
- [ ] Add file size detection
- [ ] Test with large PDFs
- [ ] Update FILE_FORMAT_SUPPORT.md

---

## Dependencies Needed

LibreOffice (already in Dockerfile):
```dockerfile
RUN apt-get install -y --no-install-recommends \
    libreoffice \  # Needed for .doc and .xls conversion
    ...
```

Python libraries (already in requirements):
- openpyxl (Excel)
- python-docx (Word)
- easyocr (OCR)
- pdf2image (PDF)

---

## Priority Recommendation

1. **First**: Fix .doc and .xls support (Quick wins, 30 min each)
2. **Then**: Add PDF chunking (Nice to have, 1 hour)
3. **Later**: Image memory optimization (Nice to have, 2 hours)

---

## Success Metrics

After all fixes:
- ✅ All Office formats supported (.doc, .docx, .xls, .xlsx, .ppt, .pptx)
- ✅ Large files don't crash (chunking for PDFs/images)
- ✅ Clear error messages for unsupported formats
- ✅ Memory usage stays < 500MB for all formats
- ✅ Users can upload any document format

---

## Before & After

**Before Current Fixes**:
- Audio .mp3: 💥 Crashes
- PowerPoint .ppt: ❌ Fails
- Word .doc: ❌ Fails
- Excel .xls: ❌ Fails
- Large PDF: ⚠️ May crash

**After All Fixes**:
- Audio .mp3: ✅ Works (300-400MB)
- PowerPoint .pptx: ✅ Works (already did)
- PowerPoint .ppt: ✅ Works (already did)
- Word .docx: ✅ Works
- Word .doc: ✅ Works (with fix)
- Excel .xlsx: ✅ Works
- Excel .xls: ✅ Works (with fix)
- Large PDF: ✅ Works (with chunking)

---

## Related Documents

- `FILE_FORMAT_SUPPORT.md` - Complete format support status
- `ALL_FIXES_SUMMARY.md` - What was already fixed
- `DEPLOYMENT_CHECKLIST.md` - How to deploy
