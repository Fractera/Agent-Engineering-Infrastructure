'use client';

import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { FooterLinkData } from '@features/footer/get-footer-links-action';

type Props = {
  links: FooterLinkData[];
  loading: boolean;
  dragOverIdx: number | null;
  onEdit: (link: FooterLinkData) => void;
  onDelete: (link: FooterLinkData) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (idx: number) => void;
  onDragEnd: () => void;
};

export function FooterMenuList({
  links, loading, dragOverIdx,
  onEdit, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No pages yet</p>;
  }

  return (
    <ul className="space-y-1">
      {links.map((link, idx) => (
        <li
          key={link.categoryId}
          draggable
          onDragStart={() => onDragStart(idx)}
          onDragOver={(e) => onDragOver(e, idx)}
          onDrop={() => onDrop(idx)}
          onDragEnd={onDragEnd}
          className={`flex items-center gap-2 min-w-0 rounded-md px-2 py-1.5 border transition-colors ${dragOverIdx === idx ? 'bg-muted border-primary' : 'border-transparent hover:bg-muted/50'}`}
        >
          <GripVertical size={14} className="text-muted-foreground cursor-grab flex-shrink-0" />
          <span className="flex-1 min-w-0 text-sm font-medium truncate">
            {link.label || <span className="text-muted-foreground italic">No label</span>}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[80px] flex-shrink-0">{link.path}</span>
          <button
            type="button"
            onClick={() => onEdit(link)}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex-shrink-0"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(link)}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </li>
      ))}
    </ul>
  );
}
