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
