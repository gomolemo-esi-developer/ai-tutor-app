# Data Folder

## Input Folder

Place test documents here for processing:

```
0_data/input/
├── lecture_01.pdf
├── notes.txt
└── chapter_03.docx
```

Supported formats:
- PDF (.pdf)
- Text (.txt)
- Word (.docx)

## Processed Folder

Metadata tracking for processed documents (optional).

## Usage

1. Drop documents into `/input`
2. Use the educator API to upload and vectorize
3. Documents are stored in Pinecone with metadata
4. Students can select any combination for chat

