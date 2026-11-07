import React from 'react';

interface RomitaMarkdownViewProps {
  content: string;
  className?: string;
}

export const RomitaMarkdownView: React.FC<RomitaMarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Renderizador inline para negrita, código, etc.
  const renderInline = (text: string): React.ReactNode => {
    // Patrón para detectar **negrita** y `código`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-[var(--app-text)]">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-500/15 text-sky-600 dark:text-sky-400 font-semibold"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Divide el contenido en bloques: tablas, listas, párrafos
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Detectar inicio de tabla Markdown (| col1 | col2 | ...)
    if (line.trim().startsWith('|') && line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|-')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || (idx === 0 && _ !== '') || (idx === arr.length - 1 && _ !== ''));

        const bodyRows = tableLines.slice(2).map((rowLine) =>
          rowLine
            .split('|')
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || (idx === 0 && _ !== '') || (idx === arr.length - 1 && _ !== ''))
        );

        blocks.push(
          <div
            key={`table-${i}`}
            className="overflow-x-auto my-2 rounded-xl border border-[var(--app-border)] shadow-2xs"
            style={{ backgroundColor: 'var(--app-surface)' }}
          >
            <table className="w-full text-left text-[11px] border-collapse min-w-[280px]">
              <thead>
                <tr className="border-b border-[var(--app-border)] bg-slate-500/10">
                  {headerCells.map((headerText, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-2.5 py-1.5 font-bold tracking-tight"
                      style={{ color: 'var(--app-text)' }}
                    >
                      {renderInline(headerText)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-500/5 transition-colors"
                  >
                    {row.map((cellText, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-2.5 py-1.5 align-middle leading-snug"
                        style={{ color: 'var(--app-text)' }}
                      >
                        {renderInline(cellText)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Detectar elementos de lista con viñetas (- o *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`list-${i}`} className="space-y-1 my-1.5 pl-2 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 3. Línea normal / párrafo
    if (line.trim()) {
      blocks.push(
        <p key={`p-${i}`} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
    } else {
      // Espaciador si hay salto de línea
      blocks.push(<div key={`space-${i}`} className="h-1" />);
    }
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
};
