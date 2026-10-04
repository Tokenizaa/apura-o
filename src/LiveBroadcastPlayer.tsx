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
  RefreshCw,
  Plus,
  Link as LinkIcon,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';

interface StreamChannel {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  isCustom?: boolean;
}

const DEFAULT_STREAMS: StreamChannel[] = [
  {
    id: 'radio-caxias',
    videoId: 'AsQb4t_7E9w',
    title: 'RÁDIO CAXIAS NAS ELEIÇÕES 2026',
    channelName: 'Caxias Play / Rádio Caxias',
  },
  {
    id: 'tse-oficial',
    videoId: 'live',
    title: 'TSE Brasil • Transmissão Oficial',
    channelName: 'Tribunal Superior Eleitoral',
  },
];

const STORAGE_KEY_CUSTOM_STREAMS = 'monitor_cb_custom_streams';
const STORAGE_KEY_ACTIVE_STREAM = 'monitor_cb_active_stream_id';

export interface LiveBroadcastPlayerProps {
  videoId?: string;
  streamTitle?: string;
  channelName?: string;
}

export const LiveBroadcastPlayer: React.FC<LiveBroadcastPlayerProps> = ({
  videoId,
  streamTitle,
  channelName,
}) => {
  // Modes: 'docked' (in-page) | 'floating' (overlay sobreposição) | 'minimized' (compact floating bar)
  const [displayMode, setDisplayMode] = useState<'docked' | 'floating' | 'minimized'>('docked');
  const [overlaySize, setOverlaySize] = useState<'small' | 'medium' | 'large'>('medium');

  // Channels state
  const [channels, setChannels] = useState<StreamChannel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_STREAMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_STREAMS;
  });

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_STREAM);
      if (savedId) return savedId;
    } catch {
      // fallback
    }
    return 'radio-caxias';
  });

  // Toggle input field for custom embed links
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [newTitleInput, setNewTitleInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Floating coordinates
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  // Current active stream object
  const activeStream =
    channels.find((c) => c.id === activeChannelId) ||
    channels[0] ||
    DEFAULT_STREAMS[0];

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_STREAMS, JSON.stringify(channels));
    } catch {
      // ignore
    }
  }, [channels]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_STREAM, activeChannelId);
    } catch {
      // ignore
    }
  }, [activeChannelId]);

  // Extract YouTube ID from full URL, embed code or raw ID
  const parseYouTubeId = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if raw 11 character ID (letters, numbers, dashes, underscores)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Check if iframe snippet pasted
    const iframeMatch = trimmed.match(/src=["'](?:https?:)?\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (iframeMatch && iframeMatch[1]) {
      return iframeMatch[1];
    }

    // Standard YouTube URL formats:
    // https://www.youtube.com/watch?v=AsQb4t_7E9w
    // https://youtu.be/AsQb4t_7E9w
    // https://www.youtube.com/live/AsQb4t_7E9w
    // https://www.youtube.com/embed/AsQb4t_7E9w
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = trimmed.match(regExp);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  };

  const handleAddCustomStream = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedId = parseYouTubeId(newUrlInput);
    if (!parsedId) {
      setErrorMessage('Link inválido. Cole uma URL do YouTube (ex: https://youtube.com/watch?v=... ou https://youtu.be/...)');
      return;
    }

    const title = newTitleInput.trim() || `Transmissão (${parsedId.slice(0, 6)}...)`;
    const newStream: StreamChannel = {
      id: `custom-${Date.now()}`,
      videoId: parsedId,
      title: title,
      channelName: 'Link Customizado',
      isCustom: true,
    };

    setChannels((prev) => [newStream, ...prev]);
    setActiveChannelId(newStream.id);
    setNewUrlInput('');
    setNewTitleInput('');
    setShowInputPanel(false);
  };

  const handleDeleteCustomStream = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannels((prev) => prev.filter((c) => c.id !== id));
    if (activeChannelId === id) {
      setActiveChannelId('radio-caxias');
    }
  };

  const embedUrl = `https://www.youtube.com/embed/${activeStream.videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
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
          width: 440,
          height: 270,
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
        <section
          aria-label="Transmissão ao vivo"
          className="mb-6 bg-neutral-900 text-white rounded-lg overflow-hidden border border-neutral-800 shadow-md"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800 gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-red-600 text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                AO VIVO
              </span>
              <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
                <Radio className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="truncate">{activeStream.title}</span>
              </span>
              <span className="hidden sm:inline-block text-[11px] text-neutral-400">
                &bull; {activeStream.channelName}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Button: Inserir Outro Link / Embed */}
              <button
                type="button"
                onClick={() => setShowInputPanel(!showInputPanel)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  showInputPanel
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                }`}
                title="Inserir outro link de vídeo ou transmissão do YouTube"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{showInputPanel ? 'Ocultar Campo' : 'Outro Link / Embed'}</span>
              </button>

              {/* Button: Float Overlay (Sobreposição de Tela) */}
              <button
                type="button"
                onClick={() => setDisplayMode('floating')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors cursor-pointer"
                title="Ativar modo sobreposição de tela (o vídeo flutua sobre a página enquanto você navega)"
              >
                <PictureInPicture className="w-3.5 h-3.5 text-amber-400" />
                <span>Sobreposição (PiP)</span>
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
                href={`https://www.youtube.com/watch?v=${activeStream.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Abrir no YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* INPUT PANEL: Inserir Outros Links de Embed / Canais do YouTube */}
          {showInputPanel && (
            <div className="bg-neutral-950 p-4 border-b border-neutral-800 animate-fade-in">
              <form onSubmit={handleAddCustomStream} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                    Inserir Novo Link ou Embed do YouTube
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowInputPanel(false)}
                    className="text-neutral-400 hover:text-white text-xs"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={newUrlInput}
                      onChange={(e) => {
                        setNewUrlInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Cole o link ou código de embed (ex: https://www.youtube.com/watch?v=... ou AsQb4t_7E9w)"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-red-500 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={newTitleInput}
                      onChange={(e) => setNewTitleInput(e.target.value)}
                      placeholder="Nome do Canal ou Título (opcional)"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-red-500 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Carregar Embed</span>
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-[11px] text-red-400 font-medium">{errorMessage}</p>
                )}

                {/* Quick Presets / Recent Channels list */}
                <div className="pt-2 border-t border-neutral-850 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-neutral-400 font-medium">Canais salvos:</span>
                  {channels.map((chan) => (
                    <div
                      key={chan.id}
                      onClick={() => setActiveChannelId(chan.id)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        activeChannelId === chan.id
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-850 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="truncate max-w-[130px]">{chan.title}</span>
                      {chan.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomStream(chan.id, e)}
                          className="hover:text-red-300 ml-0.5 p-0.5"
                          title="Excluir este canal"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            </div>
          )}

          {/* Video Iframe Container */}
          <div className="relative w-full aspect-video bg-black">
            <iframe
              key={activeStream.videoId}
              src={embedUrl}
              title={activeStream.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>

          {/* Channel selector footer bar */}
          <div className="px-4 py-2 bg-neutral-950 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-neutral-300">Transmitindo:</span>
              <span className="text-white font-medium">{activeStream.title}</span>
              <button
                type="button"
                onClick={() => setShowInputPanel(true)}
                className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Edit2 className="w-3 h-3" />
                <span>Trocar por outro link</span>
              </button>
            </div>

            <span className="text-neutral-400">
              Clique em <strong className="text-amber-400">&quot;Sobreposição (PiP)&quot;</strong> para manter o vídeo fixo na tela.
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
                {activeStream.title}
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
              key={activeStream.videoId}
              src={embedUrl}
              title={activeStream.title}
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
            {activeStream.title}
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
