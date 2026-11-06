// Utility to convert text to Unicode styled characters (Bold, Italic, Underline)
// so that plain text in textareas (for Instagram, TikTok, Facebook, WhatsApp, etc.)
// formats cleanly without markdown symbols like ** or _

export function toUnicodeBold(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Uppercase A-Z: U+1D400 to U+1D419 (A is 65 -> 0x1D400)
    if (code >= 65 && code <= 90) {
      result += String.fromCodePoint(0x1D400 + (code - 65));
    }
    // Lowercase a-z: U+1D41A to U+1D433 (a is 97 -> 0x1D41A)
    else if (code >= 97 && code <= 122) {
      result += String.fromCodePoint(0x1D41A + (code - 97));
    }
    // Digits 0-9: U+1D7CE to U+1D7D7 (0 is 48 -> 0x1D7CE)
    else if (code >= 48 && code <= 57) {
      result += String.fromCodePoint(0x1D7CE + (code - 48));
    } else {
      result += char;
    }
  }
  return result;
}

export function toUnicodeItalic(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Uppercase A-Z: U+1D434 to U+1D44D
    if (code >= 65 && code <= 90) {
      result += String.fromCodePoint(0x1D434 + (code - 65));
    }
    // Lowercase a-z: Note 'h' in math italic is U+210E (Planck constant)
    else if (code === 104) {
      result += 'ℎ';
    } else if (code >= 97 && code <= 122) {
      result += String.fromCodePoint(0x1D44E + (code - 97));
    } else {
      result += char;
    }
  }
  return result;
}

export function toUnicodeUnderline(text: string): string {
  // Combining low line U+0332
  return text.split('').map(char => char + '\u0332').join('');
}

export function toUnicodeStrikethrough(text: string): string {
  // Combining long stroke overlay U+0336
  return text.split('').map(char => char + '\u0336').join('');
}

/**
 * Applies Unicode or list formatting to a textarea element without asterisks or markdown
 */
export function applyUnicodeFormatToTextarea(
  textarea: HTMLTextAreaElement,
  format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'bullet' | 'number',
  currentValue: string,
  onChange: (newValue: string) => void
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentValue.substring(start, end);

  let replacement = '';
  let newCursorPos = end;

  if (format === 'bold') {
    if (selectedText.length > 0) {
      replacement = toUnicodeBold(selectedText);
      newCursorPos = start + replacement.length;
    } else {
      // If nothing selected, just ignore or do nothing
      return;
    }
  } else if (format === 'italic') {
    if (selectedText.length > 0) {
      replacement = toUnicodeItalic(selectedText);
      newCursorPos = start + replacement.length;
    } else {
      return;
    }
  } else if (format === 'underline') {
    if (selectedText.length > 0) {
      replacement = toUnicodeUnderline(selectedText);
      newCursorPos = start + replacement.length;
    } else {
      return;
    }
  } else if (format === 'strikethrough') {
    if (selectedText.length > 0) {
      replacement = toUnicodeStrikethrough(selectedText);
      newCursorPos = start + replacement.length;
    } else {
      return;
    }
  } else if (format === 'bullet') {
    if (selectedText.length > 0) {
      const lines = selectedText.split('\n');
      replacement = lines.map(line => (line.trim().startsWith('•') ? line : `• ${line}`)).join('\n');
      newCursorPos = start + replacement.length;
    } else {
      replacement = '• ';
      newCursorPos = start + 2;
    }
  } else if (format === 'number') {
    if (selectedText.length > 0) {
      const lines = selectedText.split('\n');
      replacement = lines.map((line, idx) => `${idx + 1}. ${line.replace(/^\d+[\.\)]\s*/, '')}`).join('\n');
      newCursorPos = start + replacement.length;
    } else {
      replacement = '1. ';
      newCursorPos = start + 3;
    }
  }

  const newValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);
  onChange(newValue);

  // Restore focus and cursor
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }, 10);
}

/**
 * Limpia y formatea textos de copys y briefs que contengan código HTML,
 * tags de AI (como data-path-to-node de Gemini), saltos 'rn' o entidades HTML.
 * Convierte párrafos en saltos limpios y preserva emojis, viñetas y hashtags.
 */
export function stripHtmlToCleanText(raw: string): string {
  if (!raw) return '';
  let text = String(raw);

  // Arreglar artefactos de 'rn' literales que preceden a tags o saltos
  text = text.replace(/rn(?=<[a-zA-Z\/!]|[\n\r]|$)/g, '\n');
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Si contiene tags HTML, procesar estructura
  if (/<[a-z!][\s\S]*>/i.test(text) || text.includes('data-path-to-node')) {
    // Eliminar comentarios HTML
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Convertir listas <li> a viñetas limpias
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<\/li>/gi, '');

    // Convertir párrafos y divs a saltos de línea ordenados
    text = text.replace(/<\/p\s*>/gi, '\n\n');
    text = text.replace(/<\/div\s*>/gi, '\n');
    text = text.replace(/<br\s*[\/]?>/gi, '\n');
    text = text.replace(/<hr\s*[\/]?>/gi, '\n---\n');

    // Convertir <strong> o <b> a texto limpio legible
    text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, (_, __, inner) => {
      const trimmed = inner.replace(/<[^>]+>/g, '').trim();
      return trimmed;
    });

    // Convertir <em> o <i> a texto limpio
    text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, (_, __, inner) => {
      const trimmed = inner.replace(/<[^>]+>/g, '').trim();
      return trimmed;
    });

    // Eliminar todos los tags HTML restantes y atributos como data-path-to-node
    text = text.replace(/<[^>]+>/g, '');
  }

  // Decodificar entidades HTML comunes y acentos
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Ntilde;/gi, 'Ñ')
    .replace(/&iquest;/gi, '¿')
    .replace(/&iexcl;/gi, '¡')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });

  // Limpiar espacios en blanco al final de cada línea y espaciado excesivo
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Genera un fragmento limpio de una sola línea para tarjetas y vistas previas en grilla
 */
export function formatCopySnippet(raw: string, maxLen = 140): string {
  if (!raw) return '';
  const cleaned = stripHtmlToCleanText(raw);
  const oneLine = cleaned.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.substring(0, maxLen).trim() + '...';
}

