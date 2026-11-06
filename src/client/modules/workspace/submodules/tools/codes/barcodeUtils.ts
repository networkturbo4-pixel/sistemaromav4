// Utilidades de Códigos de Barras y Algoritmos de Checksum (EAN-13, UPC-A, Code 128, Code 39)

// Cálculo de dígito verificador para EAN-13
export function calculateEan13Checksum(first12Digits: string): number {
  const digits = first12Digits.replace(/\D/g, '').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i] || '0', 10);
    // Posiciones impares (índice 0, 2, 4... son impares en numeración 1-based) factor 1, pares factor 3
    sum += i % 2 === 0 ? d * 1 : d * 3;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

// Validar y corregir código EAN-13
export function formatOrFixEan13(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length < 12) {
    digits = digits.padEnd(12, '0');
  }
  const first12 = digits.slice(0, 12);
  const checkDigit = calculateEan13Checksum(first12);
  return `${first12}${checkDigit}`;
}

// Cálculo de dígito verificador para UPC-A
export function calculateUpcAChecksum(first11Digits: string): number {
  const digits = first11Digits.replace(/\D/g, '').slice(0, 11);
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = parseInt(digits[i] || '0', 10);
    // En UPC-A: impares * 3, pares * 1
    sum += i % 2 === 0 ? d * 3 : d * 1;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

// Formatear o corregir UPC-A
export function formatOrFixUpcA(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length < 11) {
    digits = digits.padEnd(11, '0');
  }
  const first11 = digits.slice(0, 11);
  const checkDigit = calculateUpcAChecksum(first11);
  return `${first11}${checkDigit}`;
}

// Generador Inteligente de Código de Barras (Iniciando con prefijo elegido)
export function generateSmartBarcode(
  format: 'CODE128' | 'EAN13' | 'UPCA' | 'CODE39',
  prefix = '775'
): string {
  const cleanPrefix = prefix.replace(/\D/g, '') || '775';

  if (format === 'EAN13') {
    // Requiere 12 dígitos base + 1 checksum = 13 dígitos en total
    const neededRandom = Math.max(0, 12 - cleanPrefix.length);
    let randomPart = '';
    for (let i = 0; i < neededRandom; i++) {
      randomPart += Math.floor(Math.random() * 10).toString();
    }
    const base12 = (cleanPrefix + randomPart).slice(0, 12);
    const checksum = calculateEan13Checksum(base12);
    return `${base12}${checksum}`;
  }

  if (format === 'UPCA') {
    // Requiere 11 dígitos base + 1 checksum = 12 dígitos en total
    const neededRandom = Math.max(0, 11 - cleanPrefix.length);
    let randomPart = '';
    for (let i = 0; i < neededRandom; i++) {
      randomPart += Math.floor(Math.random() * 10).toString();
    }
    const base11 = (cleanPrefix + randomPart).slice(0, 11);
    const checksum = calculateUpcAChecksum(base11);
    return `${base11}${checksum}`;
  }

  if (format === 'CODE39') {
    // Alfanumérico estándar para inventarios (mayúsculas y números)
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += Math.floor(Math.random() * 10).toString();
    }
    return `${cleanPrefix}${randomPart}`.toUpperCase();
  }

  // CODE128 (universal de alta densidad)
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  return `${cleanPrefix}${randomPart}`;
}

// Generación Masiva por Lote
export interface BatchBarcodeItem {
  id: string;
  code: string;
  format: 'CODE128' | 'EAN13' | 'UPCA' | 'CODE39';
  label?: string;
}

export function generateBatchBarcodes(
  format: 'CODE128' | 'EAN13' | 'UPCA' | 'CODE39',
  prefix = '775',
  count = 10,
  mode: 'sequential' | 'random' = 'sequential'
): BatchBarcodeItem[] {
  const cleanPrefix = prefix.replace(/\D/g, '') || '775';
  const items: BatchBarcodeItem[] = [];

  const startNum = 1001;

  for (let i = 0; i < count; i++) {
    let code = '';
    if (mode === 'sequential') {
      const currentNum = (startNum + i).toString();
      if (format === 'EAN13') {
        const padded = (cleanPrefix + currentNum).padEnd(12, '0').slice(0, 12);
        code = `${padded}${calculateEan13Checksum(padded)}`;
      } else if (format === 'UPCA') {
        const padded = (cleanPrefix + currentNum).padEnd(11, '0').slice(0, 11);
        code = `${padded}${calculateUpcAChecksum(padded)}`;
      } else {
        code = `${cleanPrefix}${currentNum.padStart(6, '0')}`;
      }
    } else {
      code = generateSmartBarcode(format, cleanPrefix);
    }

    items.push({
      id: `batch-${i + 1}`,
      code,
      format,
      label: `Ítem #${i + 1}`,
    });
  }

  return items;
}
