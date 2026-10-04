import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [hasInstalledJustNow, setHasInstalledJustNow] = useState(false);

  if (isInstalled || hasInstalledJustNow) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
        <Check className="w-3.5 h-3.5" />
        <span>PWA Instalado</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setHasInstalledJustNow(true);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        title="Instalar como aplicativo no computador ou celular"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-3">
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-red-600" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="text-xs text-neutral-700 space-y-2.5 list-decimal list-inside leading-relaxed mb-4">
                <li>
                  No Safari, toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).
                </li>
                <li>
                  Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  Toque em <strong>Adicionar</strong> no canto superior direito para fixar o app com sobreposição.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-md bg-neutral-900 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button if prompt is not ready yet
  return (
    <button
      type="button"
      onClick={() => alert('Para instalar o PWA: clique no ícone de instalação na barra de endereço do seu navegador ou no menu "Instalar Aplicativo".')}
      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
      title="Instalar este aplicativo na tela inicial"
    >
      <Download className="w-3.5 h-3.5 text-neutral-500" />
      <span>Instalar App</span>
    </button>
  );
};
