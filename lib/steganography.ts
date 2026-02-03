/**
 * Steganography Library - LSB (Least Significant Bit) Method
 *
 * Este módulo implementa esteganografia usando o método LSB, que modifica
 * os bits menos significativos dos pixels de uma imagem para ocultar dados.
 *
 * Como funciona o LSB:
 * 1. Converte texto para binário UTF-8 (8 bits por caractere)
 * 2. Encriptação XOR opcional com a chave fornecida
 * 3. Compressão de texto substituindo repetições por §char§count§
 * 4. Adiciona marcador de fim: 8 bytes zeros (64 bits de 00000000)
 * 5. Para cada bit da mensagem binária:
 *    - Pega próximo canal RGB (sequência: R, G, B, R, G, B...)
 *    - Se bit = 1: pixel[i] = pixel[i] | 1 (força último bit para 1)
 *    - Se bit = 0: pixel[i] = pixel[i] & 0xFE (força último bit para 0)
 *    - Ignora canal Alpha completamente
 * 6. Exportação PNG via Canvas
 *
 * Capacidade: (largura × altura × 3) / 8 bytes
 */

// Constantes
const CHANNELS_PER_PIXEL = 3; // R, G, B (ignoramos Alpha completamente)
const END_MARKER_BYTES = 8; // 8 bytes zeros como marcador de fim
const END_MARKER_BITS = END_MARKER_BYTES * 8; // 64 bits zeros

/**
 * Comprime texto substituindo repetições por §char§count§
 * Exemplo: "aaaa" -> "§a§4§"
 */
export function compressText(text: string): string {
  if (!text) return text;

  let result = "";
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    let count = 1;

    // Conta caracteres repetidos consecutivos
    while (i + count < text.length && text[i + count] === char && count < 999) {
      count++;
    }

    // Só comprime se tiver 4 ou mais repetições (para economizar espaço)
    if (count >= 4) {
      result += `§${char}§${count}§`;
    } else {
      result += char.repeat(count);
    }

    i += count;
  }

  return result;
}

/**
 * Descomprime texto expandindo §char§count§ para caracteres repetidos
 */
export function decompressText(text: string): string {
  if (!text) return text;

  return text.replace(/§(.)§(\d+)§/g, (_, char, count) => {
    return char.repeat(Number.parseInt(count, 10));
  });
}

/**
 * Aplica encriptação XOR simples com uma chave
 */
export function xorEncrypt(text: string, key: string): string {
  if (!key) return text;

  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(charCode));
  }
  return result.join("");
}

/**
 * Desencripta XOR (mesma operação que encriptar)
 */
export function xorDecrypt(text: string, key: string): string {
  return xorEncrypt(text, key); // XOR é simétrico
}

/**
 * Converte uma string para um array de bits (UTF-8, 8 bits por byte)
 */
export function stringToBits(str: string): number[] {
  const bits: number[] = [];
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((bytes[i] >> j) & 1);
    }
  }

  return bits;
}

/**
 * Converte um array de bits para string
 */
export function bitsToString(bits: number[]): string {
  const bytes: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes));
}

/**
 * Calcula a capacidade máxima de uma imagem em bytes
 * Fórmula: (largura × altura × 3) / 8
 */
export function calculateCapacity(
  width: number,
  height: number
): {
  totalPixels: number;
  totalBits: number;
  totalBytes: number;
  usableBytes: number;
} {
  const totalPixels = width * height;
  const totalBits = totalPixels * CHANNELS_PER_PIXEL; // 3 bits por pixel (R, G, B)
  const totalBytes = Math.floor(totalBits / 8);
  // Reservamos espaço para o marcador de fim (8 bytes = 64 bits)
  const usableBytes = totalBytes - END_MARKER_BYTES;

  return {
    totalPixels,
    totalBits,
    totalBytes,
    usableBytes: Math.max(0, usableBytes),
  };
}

/**
 * Verifica se uma mensagem cabe numa imagem
 */
export function canFitMessage(
  messageLength: number,
  imageWidth: number,
  imageHeight: number
): { canFit: boolean; required: number; available: number; percentage: number } {
  const capacity = calculateCapacity(imageWidth, imageHeight);
  const canFit = messageLength <= capacity.usableBytes;

  return {
    canFit,
    required: messageLength,
    available: capacity.usableBytes,
    percentage:
      capacity.usableBytes > 0
        ? Math.min(100, (messageLength / capacity.usableBytes) * 100)
        : 100,
  };
}

/**
 * Codifica uma mensagem numa imagem usando LSB
 *
 * Algoritmo:
 * 1. Comprime o texto (substituindo repetições)
 * 2. Aplica encriptação XOR opcional
 * 3. Converte texto para binário UTF-8 (8 bits por caractere)
 * 4. Adiciona marcador de fim: 8 bytes zeros (64 bits)
 * 5. Carrega imagem em Canvas e extrai pixels com getImageData()
 * 6. Para cada bit da mensagem binária:
 *    - Pega próximo canal RGB (sequência: R, G, B, R, G, B...)
 *    - Se bit = 1: pixel[i] = pixel[i] | 1 (força último bit para 1)
 *    - Se bit = 0: pixel[i] = pixel[i] & 0xFE (força último bit para 0)
 *    - Ignora canal Alpha completamente
 * 7. Aplica pixels modificados com putImageData() e exporta PNG
 *
 * @param imageData - ImageData do canvas
 * @param message - Mensagem a ocultar
 * @param xorKey - Chave opcional para encriptação XOR
 * @returns ImageData modificado com a mensagem oculta
 */
export function encodeMessage(
  imageData: ImageData,
  message: string,
  xorKey?: string
): { success: boolean; imageData: ImageData; error?: string; stats?: EncodeStats } {
  const capacity = calculateCapacity(imageData.width, imageData.height);

  // 1. Comprime o texto (substitui repetições por §char§count§)
  const compressedMessage = compressText(message);

  // 2. Aplica encriptação XOR opcional
  const processedMessage = xorKey
    ? xorEncrypt(compressedMessage, xorKey)
    : compressedMessage;

  // 3. Converte texto para binário UTF-8 (8 bits por caractere)
  const messageBits = stringToBits(processedMessage);

  // 4. Adiciona marcador de fim: 8 bytes zeros (64 bits de 00000000)
  const endMarker = new Array(END_MARKER_BITS).fill(0);
  const allBits = [...messageBits, ...endMarker];

  // Verifica se cabe na imagem
  if (allBits.length > capacity.totalBits) {
    return {
      success: false,
      imageData,
      error: `Mensagem demasiado grande. Necessário: ${Math.ceil(allBits.length / 8)} bytes, Disponível: ${capacity.usableBytes} bytes`,
    };
  }

  // 5. Clona o imageData para não modificar o original
  const newData = new Uint8ClampedArray(imageData.data);
  let bitIndex = 0;

  // 6. Para cada bit da mensagem binária:
  // Percorre os pixels na sequência R, G, B, R, G, B... (ignora Alpha)
  for (let i = 0; i < newData.length && bitIndex < allBits.length; i++) {
    // Ignora o canal Alpha (cada 4º byte: índices 3, 7, 11, 15...)
    if ((i + 1) % 4 === 0) continue;

    // Se bit = 1: pixel[i] = pixel[i] | 1 (força último bit para 1)
    // Se bit = 0: pixel[i] = pixel[i] & 0xFE (força último bit para 0)
    if (allBits[bitIndex] === 1) {
      newData[i] = newData[i] | 1;
    } else {
      newData[i] = newData[i] & 0xfe;
    }
    bitIndex++;
  }

  const stats: EncodeStats = {
    originalSize: message.length,
    compressedSize: compressedMessage.length,
    encodedBits: allBits.length,
    pixelsModified: Math.ceil(allBits.length / CHANNELS_PER_PIXEL),
    totalPixels: capacity.totalPixels,
    capacityUsed: (allBits.length / capacity.totalBits) * 100,
    compressionRatio:
      message.length > 0
        ? ((message.length - compressedMessage.length) / message.length) * 100
        : 0,
  };

  // 7. Retorna ImageData modificado (será exportado como PNG via Canvas)
  return {
    success: true,
    imageData: new ImageData(newData, imageData.width, imageData.height),
    stats,
  };
}

/**
 * Descodifica uma mensagem de uma imagem
 *
 * Algoritmo:
 * 1. Extrai os LSBs de cada canal RGB (ignora Alpha)
 *    - Lê com: bit = pixel[i] & 1
 * 2. Procura o marcador de fim (64 bits zeros consecutivos = 8 bytes)
 * 3. Converte os bits antes do marcador para string UTF-8
 * 4. Desencripta XOR se chave fornecida
 * 5. Descomprime o texto
 *
 * @param imageData - ImageData do canvas
 * @param xorKey - Chave opcional para desencriptação XOR
 * @returns Mensagem extraída ou erro
 */
export function decodeMessage(
  imageData: ImageData,
  xorKey?: string
): {
  success: boolean;
  message?: string;
  error?: string;
  stats?: DecodeStats;
} {
  const data = imageData.data;
  const extractedBits: number[] = [];

  // 1. Extrai os LSBs de cada canal RGB (ignora Alpha)
  // Lê com: bit = pixel[i] & 1
  for (let i = 0; i < data.length; i++) {
    // Ignora o canal Alpha (cada 4º byte)
    if ((i + 1) % 4 === 0) continue;
    extractedBits.push(data[i] & 1);
  }

  // 2. Procura o marcador de fim (64 bits zeros consecutivos)
  let endMarkerIndex = -1;
  let consecutiveZeros = 0;

  for (let i = 0; i < extractedBits.length; i++) {
    if (extractedBits[i] === 0) {
      consecutiveZeros++;
      if (consecutiveZeros === END_MARKER_BITS) {
        endMarkerIndex = i - END_MARKER_BITS + 1;
        break;
      }
    } else {
      consecutiveZeros = 0;
    }
  }

  if (endMarkerIndex === -1) {
    return {
      success: false,
      error: "Nenhuma mensagem oculta encontrada nesta imagem",
    };
  }

  // 3. Converte os bits antes do marcador para string UTF-8
  const messageBits = extractedBits.slice(0, endMarkerIndex);

  if (messageBits.length === 0) {
    return {
      success: false,
      error: "Mensagem vazia encontrada",
    };
  }

  let message = bitsToString(messageBits);

  // 4. Desencripta XOR se chave fornecida
  if (xorKey) {
    message = xorDecrypt(message, xorKey);
  }

  // 5. Descomprime o texto
  message = decompressText(message);

  const stats: DecodeStats = {
    extractedBits: messageBits.length,
    messageSize: message.length,
    headerValid: true,
  };

  return {
    success: true,
    message,
    stats,
  };
}

/**
 * Carrega uma imagem e retorna os dados do canvas
 */
export function loadImage(
  file: File
): Promise<{ imageData: ImageData; width: number; height: number; canvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível criar contexto do canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        resolve({
          imageData,
          width: img.width,
          height: img.height,
          canvas,
        });
      };

      img.onerror = () => reject(new Error("Erro ao carregar a imagem"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Erro ao ler o ficheiro"));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte ImageData para um blob PNG via Canvas
 */
export function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Não foi possível criar contexto do canvas"));
      return;
    }

    // Aplica pixels modificados com putImageData()
    ctx.putImageData(imageData, 0, 0);

    // Exporta PNG
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Erro ao criar blob da imagem"));
        }
      },
      "image/png",
      1.0
    );
  });
}

/**
 * Gera uma URL de download para uma imagem
 */
export function createDownloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Analisa uma imagem para esteganografia
 */
export function analyzeImage(imageData: ImageData): ImageAnalysis {
  const { width, height, data } = imageData;
  const capacity = calculateCapacity(width, height);

  // Analisa a distribuição de LSBs
  let zeroBits = 0;
  let oneBits = 0;

  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 === 0) continue; // Ignora alpha
    if ((data[i] & 1) === 0) zeroBits++;
    else oneBits++;
  }

  const totalBits = zeroBits + oneBits;
  const lsbDistribution = {
    zeros: zeroBits,
    ones: oneBits,
    ratio: oneBits / totalBits,
  };

  // Calcula estatísticas de cor
  let totalR = 0,
    totalG = 0,
    totalB = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  const averageColor = {
    r: Math.round(totalR / pixelCount),
    g: Math.round(totalG / pixelCount),
    b: Math.round(totalB / pixelCount),
  };

  return {
    width,
    height,
    totalPixels: pixelCount,
    capacity,
    lsbDistribution,
    averageColor,
    format: "RGBA",
    bitsPerPixel: 32,
  };
}

// Types
export interface EncodeStats {
  originalSize: number;
  compressedSize: number;
  encodedBits: number;
  pixelsModified: number;
  totalPixels: number;
  capacityUsed: number;
  compressionRatio: number;
}

export interface DecodeStats {
  extractedBits: number;
  messageSize: number;
  headerValid: boolean;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  totalPixels: number;
  capacity: ReturnType<typeof calculateCapacity>;
  lsbDistribution: {
    zeros: number;
    ones: number;
    ratio: number;
  };
  averageColor: {
    r: number;
    g: number;
    b: number;
  };
  format: string;
  bitsPerPixel: number;
}
