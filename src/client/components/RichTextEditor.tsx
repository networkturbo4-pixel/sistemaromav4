import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Table as TableIcon,
  Code,
  Eye,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
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
  minHeight = '120px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showHtmlCode, setShowHtmlCode] = useState(false);
  const isInternalUpdate = useRef(false);
  const [isInsideTable, setIsInsideTable] = useState(false);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Detección de celda activa al hacer clic o mover el cursor
  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) {
      setIsInsideTable(false);
      activeCellRef.current = null;
      return;
    }
    let node: Node | null = sel.anchorNode;
    let foundCell: HTMLTableCellElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        foundCell = node as HTMLTableCellElement;
        break;
      }
      node = node.parentNode;
    }

    if (foundCell) {
      activeCellRef.current = foundCell;
      setIsInsideTable(true);
    } else {
      activeCellRef.current = null;
      setIsInsideTable(false);
    }
  }, []);

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    checkSelection();
  };

  // =========================================================================
  // GESTIÓN PROFESIONAL DE TABLAS (AÑADIR/ELIMINAR FILAS, COLUMNAS, ALINEACIÓN)
  // =========================================================================

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="w-full text-left my-3 border-collapse border border-slate-200 dark:border-slate-800 text-xs rounded-xl overflow-hidden shadow-2xs">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-bold">
            <th class="p-2.5 border border-slate-200 dark:border-slate-700/80 text-left font-bold">Concepto / Entregable</th>
            <th class="p-2.5 border border-slate-200 dark:border-slate-700/80 text-left font-bold">Especificación</th>
            <th class="p-2.5 border border-slate-200 dark:border-slate-700/80 text-center font-bold">Tiempo Estimado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-left">Fase 01: Planificación</td>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-left">Reunión de alineación y briefs</td>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-center">3 días hábiles</td>
          </tr>
          <tr>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-left">Fase 02: Ejecución Creativa</td>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-left">Desarrollo y diseño de activos</td>
            <td class="p-2.5 border border-slate-200 dark:border-slate-700/60 text-center">7 días hábiles</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  const addTableRow = (direction: 'above' | 'below') => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const currentRow = cell.closest('tr');
    if (!currentRow) return;

    const colCount = currentRow.children.length;
    const newRow = document.createElement('tr');
    newRow.className = 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30';

    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement('td');
      newCell.className = 'p-2.5 border border-slate-200 dark:border-slate-700/60 text-xs';
      const refCell = currentRow.children[i] as HTMLElement;
      if (refCell && refCell.style.textAlign) {
        newCell.style.textAlign = refCell.style.textAlign;
      }
      newCell.innerHTML = '<br>';
      newRow.appendChild(newCell);
    }

    if (direction === 'above') {
      currentRow.before(newRow);
    } else {
      currentRow.after(newRow);
    }

    handleInput();
  };

  const deleteTableRow = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const currentRow = cell.closest('tr');
    const table = cell.closest('table');
    if (!currentRow || !table) return;

    if (table.querySelectorAll('tr').length <= 1) {
      table.remove();
      setIsInsideTable(false);
      activeCellRef.current = null;
    } else {
      currentRow.remove();
      checkSelection();
    }
    handleInput();
  };

  const addTableColumn = (direction: 'left' | 'right') => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const colIndex = cell.cellIndex;
    const table = cell.closest('table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    rows.forEach((row) => {
      const isHeaderRow = row.parentElement?.tagName.toUpperCase() === 'THEAD' || row.querySelector('th');
      const newCell = document.createElement(isHeaderRow ? 'th' : 'td');
      newCell.className = isHeaderRow
        ? 'p-2.5 border border-slate-200 dark:border-slate-700/80 font-bold text-xs bg-slate-100 dark:bg-slate-800'
        : 'p-2.5 border border-slate-200 dark:border-slate-700/60 text-xs';
      newCell.innerHTML = isHeaderRow ? 'Nueva Columna' : '<br>';

      const targetChild = row.children[colIndex];
      if (targetChild) {
        if (direction === 'left') {
          targetChild.before(newCell);
        } else {
          targetChild.after(newCell);
        }
      } else {
        row.appendChild(newCell);
      }
    });

    handleInput();
  };

  const deleteTableColumn = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const colIndex = cell.cellIndex;
    const table = cell.closest('table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    const firstRow = rows[0];
    if (firstRow && firstRow.children.length <= 1) {
      table.remove();
      setIsInsideTable(false);
      activeCellRef.current = null;
    } else {
      rows.forEach((row) => {
        if (row.children[colIndex]) {
          row.children[colIndex].remove();
        }
      });
      checkSelection();
    }
    handleInput();
  };

  const setCellAlignment = (alignment: 'left' | 'center' | 'right') => {
    const cell = activeCellRef.current;
    if (!cell) return;
    cell.style.textAlign = alignment;
    handleInput();
  };

  const deleteEntireTable = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const table = cell.closest('table');
    if (table) {
      table.remove();
      setIsInsideTable(false);
      activeCellRef.current = null;
      handleInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && text.includes('\t') && text.includes('\n')) {
      e.preventDefault();
      const rows = text
        .trim()
        .split('\n')
        .map((r) => r.split('\t'));

      if (rows.length > 0) {
        let tableHtml =
          '<table class="w-full text-left my-3 border-collapse border border-slate-200 dark:border-slate-800 text-xs rounded-xl overflow-hidden shadow-2xs"><thead><tr class="bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100">';
        rows[0].forEach((col) => {
          tableHtml += `<th class="p-2.5 border border-slate-200 dark:border-slate-700 text-left font-bold">${col.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        for (let i = 1; i < rows.length; i++) {
          tableHtml += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40">';
          rows[i].forEach((col) => {
            tableHtml += `<td class="p-2.5 border border-slate-200 dark:border-slate-700/60">${col.trim()}</td>`;
          });
          tableHtml += '</tr>';
        }

        tableHtml += '</tbody></table><p><br></p>';
        document.execCommand('insertHTML', false, tableHtml);
        handleInput();
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-colors">
      {/* BARRA DE HERRAMIENTAS PRINCIPAL */}
      <div className="flex items-center justify-between flex-wrap gap-1 p-2 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Estilos de Párrafo / Títulos */}
          <select
            onChange={(e) => {
              const tag = e.target.value;
              executeCommand('formatBlock', tag);
            }}
            defaultValue="<p>"
            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            title="Formato de bloque / Párrafo"
          >
            <option value="<p>">Párrafo Normal</option>
            <option value="<h2>">Título Principal (H2)</option>
            <option value="<h3>">Subtítulo (H3)</option>
            <option value="<h4>">Encabezado Menor (H4)</option>
          </select>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Formato Básico */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Negrita (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Subrayado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Tachado"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('hiliteColor', '#fef08a')}
            className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition cursor-pointer"
            title="Resaltador Amarillo"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Listas */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Lista con viñetas"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Lista numerada (1, 2, 3)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Alineación de Texto */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Alinear texto a la izquierda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Centrar texto"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            title="Alinear texto a la derecha"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Insertar Tabla Moderna */}
          <button
            type="button"
            onClick={handleInsertTable}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition hover:bg-indigo-100 cursor-pointer"
            title="Insertar tabla profesional moderna"
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

      {/* BARRA DE HERRAMIENTAS CONTEXTUAL PARA TABLAS (APARECE AL HACER CLIC EN CUALQUIER CELDA) */}
      {isInsideTable && !showHtmlCode && (
        <div className="flex items-center justify-between flex-wrap gap-1 px-2.5 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-600 text-white flex items-center gap-1">
              <TableIcon className="w-2.5 h-2.5" />
              <span>Editar Tabla:</span>
            </span>

            {/* Acciones de Filas */}
            <div className="flex items-center gap-0.5 bg-white/80 dark:bg-slate-900/80 rounded-lg p-0.5 border border-indigo-200/60 dark:border-indigo-800/60">
              <button
                type="button"
                onClick={() => addTableRow('above')}
                className="px-1.5 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-0.5"
                title="Añadir fila arriba"
              >
                <Plus className="w-3 h-3" />
                <span>Fila Arriba</span>
              </button>
              <button
                type="button"
                onClick={() => addTableRow('below')}
                className="px-1.5 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-0.5"
                title="Añadir fila abajo"
              >
                <Plus className="w-3 h-3" />
                <span>Fila Abajo</span>
              </button>
              <button
                type="button"
                onClick={deleteTableRow}
                className="px-1.5 py-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-[10px] font-bold text-rose-600 dark:text-rose-400 transition flex items-center gap-0.5"
                title="Eliminar esta fila"
              >
                <Trash2 className="w-3 h-3" />
                <span>Borrar Fila</span>
              </button>
            </div>

            {/* Acciones de Columnas */}
            <div className="flex items-center gap-0.5 bg-white/80 dark:bg-slate-900/80 rounded-lg p-0.5 border border-indigo-200/60 dark:border-indigo-800/60">
              <button
                type="button"
                onClick={() => addTableColumn('left')}
                className="px-1.5 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-0.5"
                title="Añadir columna a la izquierda"
              >
                <Plus className="w-3 h-3" />
                <span>Col. Izq</span>
              </button>
              <button
                type="button"
                onClick={() => addTableColumn('right')}
                className="px-1.5 py-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-0.5"
                title="Añadir columna a la derecha"
              >
                <Plus className="w-3 h-3" />
                <span>Col. Der</span>
              </button>
              <button
                type="button"
                onClick={deleteTableColumn}
                className="px-1.5 py-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/40 text-[10px] font-bold text-rose-600 dark:text-rose-400 transition flex items-center gap-0.5"
                title="Eliminar esta columna"
              >
                <Trash2 className="w-3 h-3" />
                <span>Borrar Col.</span>
              </button>
            </div>

            {/* Alineación de la Celda Actual */}
            <div className="flex items-center gap-0.5 bg-white/80 dark:bg-slate-900/80 rounded-lg p-0.5 border border-indigo-200/60 dark:border-indigo-800/60">
              <span className="text-[10px] font-bold px-1 text-slate-400">Alinear Celda:</span>
              <button
                type="button"
                onClick={() => setCellAlignment('left')}
                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-300 transition"
                title="Alinear contenido de celda a la izquierda"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setCellAlignment('center')}
                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-300 transition"
                title="Centrar contenido de celda"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setCellAlignment('right')}
                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-300 transition"
                title="Alinear contenido de celda a la derecha"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={deleteEntireTable}
            className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            <span>Eliminar Toda la Tabla</span>
          </button>
        </div>
      )}

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
          onKeyUp={checkSelection}
          onClick={checkSelection}
          onSelect={checkSelection}
          data-placeholder={placeholder}
          className="p-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200 outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 cursor-text overflow-x-auto [&_p]:mb-1.5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1.5 [&_h4]:text-xs [&_h4]:font-bold [&_h4]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2"
          style={{ minHeight }}
        />
      )}
    </div>
  );
};
