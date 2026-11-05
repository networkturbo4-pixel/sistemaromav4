import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  List,
  Heading3,
  Table as TableIcon,
  Code,
  Eye,
  RemoveFormatting,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Describe los detalles, alcance o pega una tabla de Excel...',
  minHeight = '110px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="w-full text-left my-2.5 border-collapse border border-slate-200 dark:border-slate-800 text-xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200">
            <th class="p-2 border border-slate-200 dark:border-slate-700 font-bold">Concepto / Entregable</th>
            <th class="p-2 border border-slate-200 dark:border-slate-700 font-bold">Especificación</th>
            <th class="p-2 border border-slate-200 dark:border-slate-700 font-bold">Tiempo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-2 border border-slate-200 dark:border-slate-700">Fase 1: Conceptualización</td>
            <td class="p-2 border border-slate-200 dark:border-slate-700">3 propuestas visuales</td>
            <td class="p-2 border border-slate-200 dark:border-slate-700">5 días hábiles</td>
          </tr>
          <tr>
            <td class="p-2 border border-slate-200 dark:border-slate-700">Fase 2: Desarrollo & Normas</td>
            <td class="p-2 border border-slate-200 dark:border-slate-700">Manual y archivos vectoriales</td>
            <td class="p-2 border border-slate-200 dark:border-slate-700">7 días hábiles</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    // Detectar si el texto proviene de Excel o Google Sheets (separado por tabulaciones \t y saltos de línea \n)
    if (text && text.includes('\t') && text.includes('\n')) {
      e.preventDefault();
      const rows = text
        .trim()
        .split('\n')
        .map((r) => r.split('\t'));

      if (rows.length > 0) {
        let tableHtml =
          '<table class="w-full text-left my-2.5 border-collapse border border-slate-200 dark:border-slate-800 text-xs"><thead><tr class="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">';
        rows[0].forEach((col) => {
          tableHtml += `<th class="p-2 border border-slate-200 dark:border-slate-700">${col.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        for (let i = 1; i < rows.length; i++) {
          tableHtml += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">';
          rows[i].forEach((col) => {
            tableHtml += `<td class="p-2 border border-slate-200 dark:border-slate-700">${col.trim()}</td>`;
          });
          tableHtml += '</tr>';
        }

        tableHtml += '</tbody></table>';
        document.execCommand('insertHTML', false, tableHtml);
        handleInput();
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-2xs transition-colors">
      {/* BARRA DE HERRAMIENTAS DE FORMATO ENRIQUECIDO */}
      <div className="flex items-center justify-between flex-wrap gap-1 p-1.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Negrita (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Subrayado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('hiliteColor', '#fef08a')}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer"
            title="Resaltar texto"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Título / Encabezado (H3)"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Lista con viñetas"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertTable}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition cursor-pointer"
            title="Insertar tabla moderna"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="text-[11px]">Insertar Tabla</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            title="Limpiar formato"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggle para ver código HTML */}
        <button
          type="button"
          onClick={() => setShowHtmlCode(!showHtmlCode)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Alternar entre editor visual y código HTML"
        >
          {showHtmlCode ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          <span>{showHtmlCode ? 'Vista Visual' : 'HTML'}</span>
        </button>
      </div>

      {/* ÁREA DE EDICIÓN O CÓDIGO */}
      {showHtmlCode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 outline-none resize-y"
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          className="p-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 cursor-text overflow-x-auto"
          style={{ minHeight }}
        />
      )}
    </div>
  );
};
