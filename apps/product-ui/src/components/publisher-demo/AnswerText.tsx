import {Fragment} from 'react';

function Inline({text}: {text: string}) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : <Fragment key={i}>{part}</Fragment>)}</>;
}

// A small text-only renderer. Model output never becomes HTML or executable links.
export function AnswerText({text}: {text: string}) {
  return <div className="pub-answer-copy">{text.split(/\n\s*\n/).map((block, i) => {
    const lines = block.split('\n');
    if (lines.every(line => /^\s*[-*]\s+/.test(line))) return <ul key={i}>{lines.map((line, j) => <li key={j}><Inline text={line.replace(/^\s*[-*]\s+/, '')} /></li>)}</ul>;
    if (lines.every(line => /^\s*\d+[.)]\s+/.test(line))) return <ol key={i}>{lines.map((line, j) => <li key={j}><Inline text={line.replace(/^\s*\d+[.)]\s+/, '')} /></li>)}</ol>;
    if (/^#{1,4}\s+[^\n]+$/.test(block)) return <h3 key={i}><Inline text={block.replace(/^#{1,4}\s+/, '')} /></h3>;
    return <p key={i}><Inline text={block} /></p>;
  })}</div>;
}
