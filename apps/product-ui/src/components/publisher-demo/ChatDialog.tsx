"use client";
import {useEffect, useId, useRef, type ReactNode} from 'react';

export function ChatDialog({title, subtitle, onClose, children, compact = false}: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal();
    return () => {node?.close(); if (previous?.isConnected) previous.focus({preventScroll: true});};
  }, []);
  return <dialog ref={dialog} className={`pub-dialog${compact ? ' pub-dialog-compact' : ''}`} aria-labelledby={titleId}
    onCancel={event => {event.preventDefault(); onClose();}}
    onClick={event => {if (event.target === event.currentTarget) onClose();}}>
    <div className="pub-dialog-shell">
      <header className="pub-dialog-head"><div><h2 id={titleId}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button type="button" className="pub-close" onClick={onClose} autoFocus aria-label={`Close ${title.toLowerCase()}`}>✕</button></header>
      <div className="pub-dialog-body">{children}</div>
    </div>
  </dialog>;
}
