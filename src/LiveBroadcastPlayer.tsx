import React, { useState, useRef, useEffect } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  Volume2,
  Radio,
  Move,
  Pin,
  PictureInPicture,
  RefreshCw
} from 'lucide-react';

interface LiveBroadcastPlayerProps {
  videoId?: string;
  channelName?: string;
  streamTitle?: string;
}

export const LiveBroadcastPlayer: React.FC<LiveBroadcastPlayerProps> = ({
  videoId = 'AsQb4t_7E9w',
  channelName = 'Caxias Play / Rádio Caxias',
  streamTitle = 'RÁDIO CAXIAS NAS ELEIÇÕES 2026',
}) => {
  // Modes: 'docked' (in-page) | 'floating' (overlay sobreposição) | 'minimized' (compact floating bar) | 'hidden'
  const [displayMode, setDisplayMode] = useState<'docked' | 'floating' | 'minimized'>('docked');
  const [isOverlayPinned, setIsOverlayPinned] = useState(false);
  const [overlaySize, setOverlaySize] = useState<'small' | 'medium' | 'large'>('medium');

  // Floating coordinates
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : ''
  )}`;

  // Handle Dragging of the floating overlay
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const currentX = position ? position.x : window.innerWidth - 380;
    const currentY = position ? position.y : window.innerHeight - 260;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.startX;
      const dy = moveEvt.clientY - dragStartRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.initX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 200, dragStartRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Support for Document Picture-in-Picture if supported by Chrome/Edge
  const handleDocumentPiP = async () => {
    if ('documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 400,
          height: 250,
        });

        // Copy styles
        Array.from(document.styleSheets).forEach((styleSheet) => {
          try {
            const cssRules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch {
            const link = document.createElement('link');
            if (styleSheet.href) {
              link.rel = 'stylesheet';
              link.type = styleSheet.type;
              link.media = styleSheet.media.toString();
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        // Render iframe in native PiP
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.style.border = 'none';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.appendChild(iframe);
        return;
      } catch (err) {
        console.warn('Document PiP failed, using in-app floating overlay:', err);
      }
    }

    // Default to in-app overlay
    setDisplayMode('floating');
  };

  // Overlay dimensions based on size
  const sizeClasses = {
    small: 'w-72 h-44',
    medium: 'w-88 h-56 sm:w-96 sm:h-60',
    large: 'w-[420px] h-[260px]',
  };

  return (
    <>
      {/* 1. DOCKED MODE (Inline card in the page) */}
      {displayMode === 'docked' && (
        <section aria-label="Transmissão ao vivo" className="mb-6 bg-neutral-900 text-white rounded-lg overflow-hidden border border-neutral-800 shadow-md">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-red-600 text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                AO VIVO
              </span>
              <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
                <Radio className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">{streamTitle}</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] text-neutral-400">
                &bull; {channelName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Button: Float Overlay (Sobreposição de Tela) */}
              <button
                type="button"
                onClick={() => setDisplayMode('floating')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors cursor-pointer"
                title="Ativar modo sobreposição de tela (o vídeo flutua sobre a página enquanto você navega)"
              >
                <PictureInPicture className="w-3.5 h-3.5 text-amber-400" />
                <span>Sobreposição de Tela (PiP)</span>
              </button>

              {/* Native PiP if supported */}
              {'documentPictureInPicture' in (typeof window !== 'undefined' ? window : {}) && (
                <button
                  type="button"
                  onClick={handleDocumentPiP}
                  className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                  title="Janela flutuante nativa do sistema operacional"
                >
                  <Pin className="w-3 h-3 text-emerald-400" />
                  <span>Janela Externa</span>
                </button>
              )}

              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Abrir no YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Video Iframe Container */}
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={embedUrl}
              title={streamTitle}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>

          <div className="px-4 py-2 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80">
            <span>
              Transmissão contínua da apuração em Caxias do Sul e Rio Grande do Sul.
            </span>
            <span className="text-amber-400 font-medium">
              Dica: clique em &quot;Sobreposição de Tela&quot; para manter o vídeo visível ao rolar a página.
            </span>
          </div>
        </section>
      )}

      {/* 2. FLOATING OVERLAY MODE (Sobreposição de tela fixa ou arrastável) */}
      {displayMode === 'floating' && (
        <div
          style={
            position
              ? { left: `${position.x}px`, top: `${position.y}px` }
              : { right: '16px', bottom: '16px' }
          }
          className={`fixed z-50 rounded-lg shadow-2xl overflow-hidden border-2 border-red-600 bg-neutral-900 transition-shadow ${
            position ? '' : 'animate-fade-in'
          } ${sizeClasses[overlaySize]}`}
        >
          {/* Draggable Title Header */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-between px-3 py-1.5 bg-neutral-950 text-white cursor-move select-none border-b border-neutral-800"
            title="Arraste para mover o vídeo pela tela"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0"></span>
              <Move className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="text-[11px] font-bold truncate">
                {streamTitle}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
              {/* Resize cycle */}
              <button
                type="button"
                onClick={() =>
                  setOverlaySize((prev) =>
                    prev === 'small' ? 'medium' : prev === 'medium' ? 'large' : 'small'
                  )
                }
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                title="Alterar tamanho da janela"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              {/* Minimize to compact bar */}
              <button
                type="button"
                onClick={() => setDisplayMode('minimized')}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                title="Minimizar para barra"
              >
                <Minimize2 className="w-3 h-3" />
              </button>

              {/* Restore to in-page Docked */}
              <button
                type="button"
                onClick={() => {
                  setPosition(null);
                  setDisplayMode('docked');
                }}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                title="Fixar de volta no topo da página"
              >
                <Pin className="w-3 h-3" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setDisplayMode('docked')}
                className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800 transition-colors"
                title="Fechar sobreposição"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Floating Video Iframe */}
          <div className="w-full h-[calc(100%-28px)] bg-black">
            <iframe
              src={embedUrl}
              title={streamTitle}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* 3. MINIMIZED BAR (Compact floating pill) */}
      {displayMode === 'minimized' && (
        <div className="fixed bottom-4 right-4 z-50 bg-neutral-950 text-white border-2 border-red-600 rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            AO VIVO
          </span>
          <span className="text-xs font-medium text-neutral-200 truncate max-w-[180px]">
            {streamTitle}
          </span>
          <button
            type="button"
            onClick={() => setDisplayMode('floating')}
            className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-full cursor-pointer transition-colors"
          >
            Restaurar Vídeo
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('docked')}
            className="p-1 text-neutral-400 hover:text-white"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
