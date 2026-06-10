'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createYjsProvider, getYjsAwarenessState } from '@/lib/realtime/yjs-provider';
import { useUser } from '@/hooks/useUser';
import { useWorkspace } from '@/hooks/useWorkspace';
import type * as Y from 'yjs';

interface IssueDescriptionEditorProps {
  issueExternalId: string;
  initialDescription: string;
  onSave?: (text: string) => void;
  readOnly?: boolean;
}

export function IssueDescriptionEditor({
  issueExternalId,
  initialDescription,
  onSave,
  readOnly = false,
}: IssueDescriptionEditorProps) {
  const { user } = useUser();
  const { id: workspaceId } = useWorkspace();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialDescription);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [coEditors, setCoEditors] = useState<string[]>([]);
  const yTextRef = useRef<Y.Text | null>(null);
  const isInternalUpdate = useRef(false);
  const destroyRef = useRef<() => void>(() => {});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id || !issueExternalId || !workspaceId) return;

    const { yText: yt, destroy } = createYjsProvider(
      workspaceId,
      issueExternalId,
      { id: user.id, name: user.name ?? 'Anonymous', color: '#6366f1' },
    );

    yTextRef.current = yt;
    setIsCollaborative(true);

    const observer = () => {
      isInternalUpdate.current = true;
      setValue(yt.toString());
    };
    yt.observe(observer);

    const awarenessInterval = setInterval(() => {
      const states = getYjsAwarenessState(issueExternalId);
      if (states) {
        const others = states.filter((s) => s.id !== user.id).map((s) => s.name);
        setCoEditors(others);
      }
    }, 2000);

    destroyRef.current = destroy;

    return () => {
      yt.unobserve(observer);
      clearInterval(awarenessInterval);
      destroy();
    };
  }, [issueExternalId, workspaceId, user?.id, user?.name]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const newValue = e.target.value;
    setValue(newValue);

    const yt = yTextRef.current;
    if (yt) {
      yt.delete(0, yt.length);
      yt.insert(0, newValue);
    }

    if (onSave) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSave(newValue);
      }, 1500);
    }
  }, [onSave]);

  return (
    <div className="relative">
      {isCollaborative && (
        <div className="mb-1 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
          <span>Collaborative editing active</span>
          {coEditors.length > 0 && (
            <>
              <span className="text-[var(--color-text-faint)]">·</span>
              <span>{coEditors.join(', ')} {coEditors.length === 1 ? 'is' : 'are'} editing</span>
            </>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        rows={6}
        placeholder="Add a description..."
      />
    </div>
  );
}
