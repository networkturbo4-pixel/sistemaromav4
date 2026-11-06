import { createWorker } from 'tesseract.js';

export interface VoucherOcrResult {
  operationNumber?: string;
  amount?: number;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  bankDetected?: string;
  rawText: string;
  confidence: number;
}

export type OcrProgressCallback = (progress: number, statusText: string) => void;

/**
 * Normaliza y formatea texto para facilitar expresiones regulares
 */
const cleanText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ');
};

/**
 * Detecta banco o billetera digital por palabras clave
 */
const detectBank = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  if (lower.includes('yape')) return 'Yape (BCP)';
  if (lower.includes('plin')) return 'Plin';
  if (lower.includes('bcp') || lower.includes('banco de credito') || lower.includes('banco de crédito')) return 'BCP';
  if (lower.includes('interbank')) return 'Interbank';
  if (lower.includes('bbva') || lower.includes('continental')) return 'BBVA';
  if (lower.includes('scotiabank')) return 'Scotiabank';
  if (lower.includes('banco de la nacion') || lower.includes('banco de la nación')) return 'Banco de la Nación';
  if (lower.includes('banbif')) return 'BanBif';
  return undefined;
};

/**
 * Extrae el número de operación bancaria
 */
const extractOperationNumber = (text: string): string | undefined => {
  // Patrones frecuentes en comprobantes de bancos peruanos
  const patterns = [
    /(?:n[°ºo]?\s*(?:de\s*)?(?:operaci[oó]n|transacci[oó]n|constancia|referencia)|c[oó]d(?:igo)?\s*operaci[oó]n|op(?:eraci[oó]n)?\.?)[:\s#]*([0-9]{4,14})/i,
    /(?:n[uú]mero\s*(?:de\s*)?operaci[oó]n)[:\s#]*([0-9]{4,14})/i,
    /(?:operaci[oó]n\s*n[°ºo]?|op\s*n[°ºo]?)[:\s#]*([0-9]{4,14})/i,
    /(?:c[oó]digo\s*de\s*seguridad|c[oó]digo\s*de\s*aprobaci[oó]n)[:\s#]*([0-9]{4,10})/i,
    /(?:constancia\s*n[°ºo]?)[:\s#]*([0-9]{4,14})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Búsqueda por línea directa que contenga 'operacion' o 'op'
  const lines = text.split('\n');
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes('operac') || l.includes('constancia') || l.includes('op.')) {
      const numbers = line.match(/\b\d{5,12}\b/);
      if (numbers) return numbers[0];
    }
  }

  return undefined;
};

/**
 * Extrae el importe pagado
 */
const extractAmount = (text: string): number | undefined => {
  // Busca montos con S/ o PEN o Total o Importe
  const patterns = [
    /(?:s\/\.?|pen|s\s*\/\.?)\s*([0-9]{1,4}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2}))/i,
    /(?:importe|monto|total|pagado|transferido)[:\s]*(?:s\/\.?)?\s*([0-9]{1,4}(?:[,\.][0-9]{3})*(?:[,\.][0-9]{2}))/i,
    /(?:s\/\.?|pen)\s*([0-9]+(?:\.[0-9]{2})?)/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const rawNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(rawNum);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  return undefined;
};

/**
 * Extrae fecha y la formatea en YYYY-MM-DD
 */
const extractDate = (text: string): string | undefined => {
  // 1. Formato DD/MM/AAAA o DD-MM-AAAA
  const matchNumeric = text.match(/\b([0-3]?[0-9])[\/\-]([0-1]?[0-9])[\/\-](202[4-9]|203[0-9]|[2-3][0-9])\b/);
  if (matchNumeric) {
    let day = matchNumeric[1].padStart(2, '0');
    let month = matchNumeric[2].padStart(2, '0');
    let year = matchNumeric[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // 2. Formato textual: 05 nov 2026 o 5 de noviembre de 2026
  const monthsMap: Record<string, string> = {
    ene: '01', enero: '01',
    feb: '02', febrero: '02',
    mar: '03', marzo: '03',
    abr: '04', abril: '04',
    may: '05', mayo: '05',
    jun: '06', junio: '06',
    jul: '07', julio: '07',
    ago: '08', agosto: '08',
    set: '09', sep: '09', septiembre: '09', setiembre: '09',
    oct: '10', octubre: '10',
    nov: '11', noviembre: '11',
    dic: '12', diciembre: '12',
  };

  const matchTextual = text.match(/\b([0-3]?[0-9])\s*(?:de\s*)?([a-z]{3,10})\.?\s*(?:de\s*|,\s*)?(202[4-9]|203[0-9])\b/i);
  if (matchTextual) {
    const day = matchTextual[1].padStart(2, '0');
    const monthStr = matchTextual[2].toLowerCase();
    const month = monthsMap[monthStr];
    const year = matchTextual[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return undefined;
};

/**
 * Extrae la hora en formato HH:mm (24h)
 */
const extractTime = (text: string): string | undefined => {
  const match = text.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?\s*(am|pm|a\.m\.|p\.m\.)?\b/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = (match[3] || '').toLowerCase().replace(/\./g, '');

    if (modifier === 'pm' && hours < 12) {
      hours += 12;
    } else if (modifier === 'am' && hours === 12) {
      hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return undefined;
};

/**
 * Analiza un archivo de voucher mediante OCR y extrae datos estructurados
 */
export const parseVoucherWithOcr = async (
  imageSource: File | Blob | string,
  onProgress?: OcrProgressCallback
): Promise<VoucherOcrResult> => {
  const worker = await createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const pct = Math.round((m.progress || 0) * 100);
        onProgress(pct, `Reconociendo texto del comprobante... (${pct}%)`);
      } else if (onProgress && m.status) {
        onProgress(15, `Cargando motor de OCR (${m.status})...`);
      }
    },
  });

  try {
    const ret = await worker.recognize(imageSource);
    const rawText = cleanText(ret.data.text || '');
    const confidence = ret.data.confidence || 0;

    const opNumber = extractOperationNumber(rawText);
    const amount = extractAmount(rawText);
    const date = extractDate(rawText);
    const time = extractTime(rawText);
    const bank = detectBank(rawText);

    return {
      operationNumber: opNumber,
      amount,
      date,
      time,
      bankDetected: bank,
      rawText,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
};
