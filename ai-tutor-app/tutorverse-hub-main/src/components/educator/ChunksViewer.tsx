import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Loader2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

interface Chunk {
  index: number;
  chunk_id: string;
  text: string;
  length: number;
  metadata: Record<string, any>;
}

interface ChunksViewerProps {
  fileId: string;
  fileName: string;
  documentId: string;
}

export function ChunksViewer({ fileId, fileName, documentId }: ChunksViewerProps) {
  const [open, setOpen] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { get: getChunks } = useApi<any>();
  const { token } = useAuth();

  useEffect(() => {
    if (open && chunks.length === 0) {
      fetchChunks();
    }
  }, [open]);

  const fetchChunks = async () => {
    setLoading(true);
    setError(null);
    
    // If no documentId, show error
    if (!documentId) {
      setError('File has not been processed by RAG yet. Please re-upload the file.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await getChunks(`/api/educator/files/${fileId}/chunks?documentId=${documentId}`);
      if (response?.data?.chunks) {
        setChunks(response.data.chunks);
        setCurrentIndex(0);
      } else if (response?.chunks) {
        setChunks(response.chunks);
        setCurrentIndex(0);
      } else {
        setError('No chunks found for this document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chunks');
    } finally {
      setLoading(false);
    }
  };

  const filteredChunks = chunks.filter(chunk =>
    chunk.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentChunk = filteredChunks[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(filteredChunks.length - 1, currentIndex + 1));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          title="View document chunks"
        >
          <Eye className="h-4 w-4 text-blue-500" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Chunks Viewer</DialogTitle>
          <DialogDescription>
            {fileName} • {chunks.length} total chunks
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading chunks...</span>
          </div>
        ) : chunks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No chunks found for this document.
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="space-y-4">
              <Input
                placeholder="Search chunks..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentIndex(0);
                }}
                className="w-full"
              />

              {/* Chunk Display */}
              {currentChunk && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        Chunk {currentChunk.index + 1} of {filteredChunks.length}
                      </div>
                      <Badge variant="secondary">
                        {currentChunk.length} characters
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {currentChunk.chunk_id.substring(0, 12)}...
                    </div>
                  </div>

                  {/* Content */}
                  <div className="rounded bg-background p-4 font-mono text-sm max-h-96 overflow-y-auto">
                    {currentChunk.text}
                  </div>

                  {/* Metadata */}
                  {Object.keys(currentChunk.metadata).length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Metadata
                      </div>
                      <div className="space-y-1 text-xs">
                        {Object.entries(currentChunk.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">
                              {String(value).substring(0, 50)}
                              {String(value).length > 50 ? '...' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {searchTerm && `Showing ${filteredChunks.length} of ${chunks.length} chunks`}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === filteredChunks.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Chunk Index */}
              <div className="grid grid-cols-4 gap-1">
                {filteredChunks.slice(0, 20).map((chunk, idx) => (
                  <button
                    key={chunk.chunk_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`rounded p-2 text-xs font-medium transition-colors ${
                      idx === currentIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {chunk.index + 1}
                  </button>
                ))}
                {filteredChunks.length > 20 && (
                  <div className="rounded p-2 text-xs text-muted-foreground">
                    +{filteredChunks.length - 20} more
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
