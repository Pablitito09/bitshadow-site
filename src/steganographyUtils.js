// src/steganographyUtils.js

export const simpleEncrypt = (text, pass) => {
  if (!pass) return text;
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ pass.charCodeAt(i % pass.length);
    encrypted += String.fromCharCode(charCode);
  }
  return encrypted;
};

export const compressText = (text, compressionLevel) => {
  if (compressionLevel === 'none') return text;

  // Compressão simples: substitui sequências repetidas
  if (compressionLevel === 'basic') {
    return text.replace(/(.)\1{2,}/g, (match) => {
      return `§${match[0]}${match.length}§`;
    });
  }

  // Compressão avançada: remove espaços duplicados e compacta
  if (compressionLevel === 'advanced') {
    return text
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{2,}/g, (match) => `§${match[0]}${match.length}§`);
  }

  return text;
};

export const decompressText = (text, compressionLevel) => {
  if (compressionLevel === 'none') return text;

  return text.replace(/§(.)(\d+)§/g, (match, char, count) => {
    return char.repeat(parseInt(count, 10));
  });
};

export const textToBinary = (text) => {
  return text
    .split('')
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('');
};

export const binaryToText = (binary) => {
  let text = '';
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    if (byte.length === 8) {
      const charCode = parseInt(byte, 2);
      if (charCode === 0) break;
      text += String.fromCharCode(charCode);
    }
  }
  return text;
};
