import React from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  idKey: keyof T;
  hideActions?: boolean;
}

function DataTable<T>({
  columns,
  data,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  idKey,
  hideActions = false,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="w-12 p-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="text-left p-4 text-sm font-medium text-muted-foreground whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
              {!hideActions && (
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => {
              const id = String(item[idKey]);
              const isSelected = selectedIds.includes(id);

              return (
                <tr
                  key={id}
                  className={cn(
                    "hover:bg-secondary/30 transition-colors",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelect(id)}
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={`${id}-${String(col.key)}`} className="p-4 text-sm font-normal text-foreground">
                      {col.render ? (
                        col.render(item)
                      ) : (
                        <span>
                          {String(item[col.key as keyof T] || '-')}
                        </span>
                      )}
                    </td>
                  ))}
                  {!hideActions && (
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(item)}
                        >
                          <Edit2 className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-muted-foreground">No data found.</p>
        </div>
      )}

      <div className="p-4 border-t border-border flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} selected`
            : `Showing ${data.length} items`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page 1 of 1
          </span>
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
