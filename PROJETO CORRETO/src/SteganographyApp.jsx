// src/SteganographyApp.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Unlock,
  FileImage,
  Key,
  Eye,
  EyeOff,
  Info,
  Zap,
  Shield,
  Download,
  BarChart3,
} from 'lucide-react';

import {
  simpleEncrypt,
  compressText,
  decompressText,
  textToBinary,
  binaryToText,
} from './steganographyUtils';

export default function SteganographyApp() {
  const [mode, setMode] = useState('encode');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [processedImage, setProcessedImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [useEncryption, setUseEncryption] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState('none');
  const [bitsPerChannel, setBitsPerChannel] = useState(1);
  const [capacity, setCapacity] = useState(0);
  const [usedCapacity, setUsedCapacity] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (image) {
      const maxBits = image.width * image.height * 3 * bitsPerChannel;
      const maxChars = Math.floor(maxBits / 8) - 9; // -9 para o marcador ###END###
      setCapacity(maxChars);
    }
  }, [image, bitsPerChannel]);

  useEffect(() => {
    if (message) {
      setUsedCapacity(message.length);
    } else {
      setUsedCapacity(0);
    }
  }, [message]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setDecodedMessage('');
          setProcessedImage(null);
          setUsedCapacity(0);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const encodeMessage = () => {
    if (!image || !message) {
      alert('Por favor, carrega uma imagem e escreve uma mensagem!');
      return;
    }

    if (message.length > capacity) {
      alert(`Mensagem demasiado longa! Máximo: ${capacity} caracteres.`);
      return;
    }

    if (useEncryption && !password) {
      alert('Por favor, define uma password para encriptação!');
      return;
    }

    const startTime = performance.now();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Processa a mensagem
    let processedMsg = compressText(message, compressionLevel);
    if (useEncryption) {
      processedMsg = simpleEncrypt(processedMsg, password);
    }

    const fullMessage = processedMsg + '###END###';
    const binary = textToBinary(fullMessage);

    if (binary.length > data.length * bitsPerChannel) {
      alert('Mensagem demasiado longa para esta imagem!');
      return;
    }

    // Codifica usando múltiplos bits por canal
    let binaryIndex = 0;
    for (let i = 0; i < data.length - 1 && binaryIndex < binary.length; i++) {
      if (i % 4 === 3) continue; // Pula o canal alpha

      // Limpa os bits LSB e insere os novos
      const mask = ~((1 << bitsPerChannel) - 1);
      data[i] = data[i] & mask;

      for (let bit = 0; bit < bitsPerChannel && binaryIndex < binary.length; bit++) {
        data[i] |= parseInt(binary[binaryIndex], 10) << bit;
        binaryIndex++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const encodedImageUrl = canvas.toDataURL('image/png');
    setProcessedImage(encodedImageUrl);

    const endTime = performance.now();
    setProcessingTime((endTime - startTime).toFixed(2));
    setShowStats(true);

    alert('✅ Mensagem codificada com sucesso!');
  };

  const decodeMessage = () => {
    if (!image) {
      alert('Por favor, carrega uma imagem!');
      return;
    }

    const startTime = performance.now();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let binary = '';
    // Extrai bits de todos os canais RGB
    for (let i = 0; i < data.length - 1; i++) {
      if (i % 4 === 3) continue; // Pula o canal alpha

      for (let bit = 0; bit < bitsPerChannel; bit++) {
        binary += ((data[i] >> bit) & 1).toString();
      }
    }

    let text = binaryToText(binary);
    const endMarker = text.indexOf('###END###');

    if (endMarker !== -1) {
      text = text.substring(0, endMarker);

      if (useEncryption) {
        if (!password) {
          alert('Esta mensagem está encriptada! Insere a password.');
          return;
        }
        text = simpleEncrypt(text, password);
      }

      text = decompressText(text, compressionLevel);
      setDecodedMessage(text);

      const endTime = performance.now();
      setProcessingTime((endTime - startTime).toFixed(2));
      setShowStats(true);
    } else {
      setDecodedMessage('❌ Nenhuma mensagem encontrada ou formato incorreto.');
    }
  };

  const downloadImage = () => {
    if (!processedImage) {
      alert('Nenhuma imagem processada para descarregar!');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `stego_${Date.now()}.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (err) {
      console.error('Erro ao descarregar:', err);
      window.open(processedImage, '_blank');
    }
  };

  const compareImages = () => {
    if (!image || !processedImage) return;

    const canvas1 = document.createElement('canvas');
    const canvas2 = canvasRef.current;
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    canvas1.width = image.width;
    canvas1.height = image.height;
    ctx1.drawImage(image, 0, 0);

    const original = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
    const modified = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);

    let differences = 0;
    for (let i = 0; i < original.data.length; i++) {
      if (original.data[i] !== modified.data[i]) {
        differences++;
      }
    }

    const totalPixels = original.data.length;
    const diffPercentage = ((differences / totalPixels) * 100).toFixed(4);

    alert(
      `📊 Análise de Diferenças:\n\nPixels alterados: ${differences} de ${totalPixels}\nPercentagem: ${diffPercentage}%\n\nAs alterações são invisíveis ao olho humano! 👁️`
    );
  };

  const capacityPercent = capacity > 0 ? ((usedCapacity / capacity) * 100).toFixed(1) : 0;
  const barWidth = Math.min(capacityPercent, 100);

  return (
    <div className="app-container">
      <div className="app-wrapper">
        <div className="app-card">
          {/* Header */}
          <div className="app-header">
            <div>
              <h1 className="app-title">
                <Shield className="icon-lg" />
                Esteganografia PRO
              </h1>
              <p className="app-subtitle">Sistema avançado de ocultação de mensagens</p>
            </div>
            <Zap className="app-zap-icon" />
          </div>

          {/* Mode Selector */}
          <div className="mode-selector">
            <button
              onClick={() => setMode('encode')}
              className={`mode-button ${mode === 'encode' ? 'active' : ''}`}
            >
              <Lock className="icon-sm" />
              Codificar
            </button>
            <button
              onClick={() => setMode('decode')}
              className={`mode-button ${mode === 'decode' ? 'active' : ''}`}
            >
              <Unlock className="icon-sm" />
              Descodificar
            </button>
          </div>

          {/* Image Upload */}
          <div className="section">
            <label className="section-label">
              <FileImage className="icon-sm" />
              Imagem (PNG/JPG)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageUpload}
              className="file-input"
            />
            {capacity > 0 && (
              <div className="capacity-info">
                📦 Capacidade: {capacity} caracteres | Usado: {usedCapacity} ({capacityPercent}%)
                <div className="capacity-bar">
                  <div
                    className="capacity-bar-fill"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="section advanced-settings">
            <h3 className="section-title">
              <Info className="icon-sm" />
              Configurações Avançadas
            </h3>

            {/* Encryption */}
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="encryption"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="encryption" className="checkbox-label">
                <Key className="icon-xs" />
                Encriptação com Password
              </label>
            </div>

            {useEncryption && (
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password secreta..."
                  className="input password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>
            )}

            {/* Compression */}
            <div className="field">
              <label className="field-label">Compressão de Texto:</label>
              <select
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(e.target.value)}
                className="select"
              >
                <option value="none">Nenhuma</option>
                <option value="basic">Básica</option>
                <option value="advanced">Avançada</option>
              </select>
            </div>

            {/* Bits per channel */}
            <div className="field">
              <label className="field-label">
                Bits por Canal: {bitsPerChannel} (maior = mais capacidade, menos seguro)
              </label>
              <input
                type="range"
                min="1"
                max="4"
                value={bitsPerChannel}
                onChange={(e) => setBitsPerChannel(parseInt(e.target.value, 10))}
                className="slider"
              />
            </div>
          </div>

          {/* Encode Mode */}
          {mode === 'encode' && (
            <div className="section">
              <label className="section-label">Mensagem Secreta</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreve a tua mensagem secreta aqui..."
                className="textarea"
              />
              <p className="helper-text">
                {message.length} / {capacity} caracteres
              </p>
              <button
                onClick={encodeMessage}
                disabled={!image || !message}
                className="btn btn-primary full-width"
              >
                <Lock className="icon-sm" />
                Codificar na Imagem
              </button>
            </div>
          )}

          {/* Decode Mode */}
          {mode === 'decode' && (
            <div className="section">
              <button
                onClick={decodeMessage}
                disabled={!image}
                className="btn btn-secondary full-width"
              >
                <Unlock className="icon-sm" />
                Descodificar Mensagem
              </button>
              {decodedMessage && (
                <div
                  className={`decoded-box ${
                    decodedMessage.includes('❌') ? 'decoded-error' : 'decoded-success'
                  }`}
                >
                  <label
                    className={`decoded-label ${
                      decodedMessage.includes('❌') ? 'error' : 'success'
                    }`}
                  >
                    Mensagem Recuperada:
                  </label>
                  <p className="decoded-text">{decodedMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {processedImage && (
            <div className="button-row">
              <button
                onClick={downloadImage}
                className="btn btn-success"
              >
                <Download className="icon-sm" />
                Descarregar Imagem
              </button>
              <button
                onClick={compareImages}
                className="btn btn-warning"
              >
                <BarChart3 className="icon-sm" />
                Analisar Diferenças
              </button>
            </div>
          )}

          {/* Stats */}
          {showStats && (
            <div className="stats-card">
              <h3 className="stats-title">📊 Estatísticas:</h3>
              <p className="stats-text">⏱️ Tempo de processamento: {processingTime}ms</p>
              <p className="stats-text">🔧 Bits por canal: {bitsPerChannel}</p>
              <p className="stats-text">🗜️ Compressão: {compressionLevel}</p>
              <p className="stats-text">
                🔐 Encriptação: {useEncryption ? 'Ativada' : 'Desativada'}
              </p>
            </div>
          )}

          {/* Preview */}
          {image && (
            <div className="preview-card">
              <h3 className="section-title">🖼️ Imagem:</h3>
              <div className="preview-grid">
                <div>
                  <p className="preview-label">Original</p>
                  <img src={image.src} alt="Original" className="preview-image" />
                </div>
                {processedImage && (
                  <div>
                    <p className="preview-label">Com Mensagem Oculta</p>
                    <img
                      src={processedImage}
                      alt="Processada"
                      className="preview-image processed"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden-canvas" />
        </div>

        {/* Info Section */}
        <div className="info-grid">
          <div className="info-card">
            <h3 className="info-title">
              <Info className="icon-sm" />
              Como Funciona
            </h3>
            <p className="info-text">
              Usa esteganografia LSB (Least Significant Bit) com suporte a múltiplos bits por
              canal, encriptação XOR e compressão de texto. As alterações são
              imperceptíveis ao olho humano!
            </p>
          </div>

          <div className="info-card">
            <h3 className="info-title">
              <Shield className="icon-sm" />
              Funcionalidades PRO
            </h3>
            <ul className="info-list">
              <li>✅ Encriptação com password</li>
              <li>✅ Compressão de mensagens</li>
              <li>✅ Configuração de bits/canal</li>
              <li>✅ Análise de diferenças</li>
              <li>✅ Estatísticas detalhadas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
