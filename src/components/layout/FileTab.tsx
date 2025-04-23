
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileItem } from '@/types';

interface FileTabProps {
  file: FileItem;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export function FileTab({ file, isActive, onClick, onClose }: FileTabProps) {
  return (
    <div 
      className={`
        flex items-center h-8 px-3 border-r border-border cursor-pointer
        ${isActive ? 'bg-background' : 'bg-card hover:bg-muted'}
      `}
      onClick={onClick}
    >
      <span className="text-sm truncate max-w-[120px]">{file.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 ml-2 rounded-full opacity-60 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
