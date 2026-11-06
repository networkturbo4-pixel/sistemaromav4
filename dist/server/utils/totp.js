"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.generateTotpCode = generateTotpCode;
exports.verifyTotpCode = verifyTotpCode;
exports.buildOtpAuthUri = buildOtpAuthUri;
const crypto_1 = __importDefault(require("crypto"));
// Alfabeto RFC 4648 Base32
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/**
 * Genera un secreto aleatorio en Base32 para Google Authenticator (16 a 32 caracteres)
 */
function generateTotpSecret(length = 20) {
    let secret = '';
    const randomBytes = crypto_1.default.randomBytes(length);
    for (let i = 0; i < length; i++) {
        secret += BASE32_CHARS[randomBytes[i] % 32];
    }
    return secret;
}
/**
 * Decodifica una cadena Base32 a Buffer
 */
function base32ToBuffer(base32) {
    const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
    let bits = '';
    for (let i = 0; i < clean.length; i++) {
        const val = BASE32_CHARS.indexOf(clean[i]);
        if (val === -1)
            continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return Buffer.from(bytes);
}
/**
 * Calcula el código TOTP de 6 dígitos para un secreto y una ventana de tiempo
 */
function generateTotpCode(secret, timeStepWindow) {
    const windowIndex = timeStepWindow ?? Math.floor(Date.now() / 1000 / 30);
    const keyBuffer = base32ToBuffer(secret);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(windowIndex), 0);
    const hmac = crypto_1.default.createHmac('sha1', keyBuffer);
    hmac.update(timeBuffer);
    const digest = hmac.digest();
    // Truncamiento dinámico RFC 4226
    const offset = digest[digest.length - 1] & 0xf;
    const binaryCode = ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);
    const otp = binaryCode % 1000000;
    return String(otp).padStart(6, '0');
}
/**
 * Verifica si un código de 6 dígitos ingresado es válido
 * Acepta ventana de tiempo actual, anterior y posterior (±30s)
 */
function verifyTotpCode(token, secret, toleranceWindows = 1) {
    if (!token || !secret || !/^\d{6}$/.test(token.trim()))
        return false;
    const currentWindow = Math.floor(Date.now() / 1000 / 30);
    const inputCode = token.trim();
    for (let i = -toleranceWindows; i <= toleranceWindows; i++) {
        const validCode = generateTotpCode(secret, currentWindow + i);
        if (validCode === inputCode) {
            return true;
        }
    }
    return false;
}
/**
 * Construye la URI para escanear en Google Authenticator
 * Formato: otpauth://totp/Issuer:Account?secret=SECRET&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 */
function buildOtpAuthUri(issuer, accountName, secret) {
    const encIssuer = encodeURIComponent(issuer.trim());
    const encAccount = encodeURIComponent(accountName.trim());
    return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}
