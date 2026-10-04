import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  RefreshCw,
  Bell,
  BellRing,
  ExternalLink,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Download,
  Newspaper,
  Globe,
  Youtube,
  Share2,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Vote,
  Award,
  AlertTriangle,
  Volume2,
  VolumeX,
  UserCheck,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Info,
  History,
  Tv,
  Radio
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { LiveBroadcastPlayer } from './LiveBroadcastPlayer';
import { OfflineIndicator } from './OfflineIndicator';

interface CandidateVote {
  porcentagem: string;
  quantidade: number;
}

interface Candidate {
  nome: string;
  numero: string;
  partido: string;
  coligacao?: string;
  posicao?: number;
  classificacao?: number;
  votos: CandidateVote;
  eleito: string;
  matEleito?: string;
  matPerdedor?: boolean;
  destinacaoDosVotos?: string;
  foto?: string;
}

interface ApuracaoData {
  sourceUrl: string;
  scrapedAt: string;
  dataHoraTse?: string;
  dataRecebimento?: string;
  pageMeta: {
    generatedAt: string;
    ssrState: string;
    phase: string;
    stateName: string;
    uf: string;
    year: string;
  };
  urnas: {
    andamento: string;
    percentual: number;
    secoesTotalizadas: number;
    secoes: number;
    eleitores: number;
    eleitoradoApurado: number;
    totalizacaoFinal: boolean;
    aguardandoApuracao: boolean;
    votos?: {
      validos?: CandidateVote;
      brancos?: CandidateVote;
      nulos?: CandidateVote;
      abstencao?: CandidateVote;
      comparecimento?: number;
    };
  };
  carlosBurigo: {
    nome: string;
    numero: string;
    partido: string;
    cargo: string;
    posicao: number;
    votos: CandidateVote;
    eleito: string;
    destinacaoDosVotos: string;
    statusDescricao: string;
  } | null;
  governador: Candidate[];
  senador: Candidate[];
  deputadosEstaduaisDestaques: Candidate[];
  deputadosFederaisDestaques: Candidate[];
  totalCandidatosEstaduais: number;
  totalCandidatosFederais: number;
  hasChangesSinceLastCheck: boolean;
  lastChangeDescription?: string;
}

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  timestamp: number;
  source: string;
  snippet: string;
  query: string;
  firstSeenAt: string;
  isNew?: boolean;
}

const DEFAULT_QUERIES = [
  '"Carlos Burigo"',
  '"Carlos Burigo" deputado',
  '"Carlos Burigo" apuração',
  '"Carlos Burigo" eleições',
  '"Carlos Burigo" votos',
  '"Carlos Burigo" Assembleia',
  '"Carlos Burigo" notícia',
];

const STORAGE_KEY_QUERIES = 'monitor_carlos_burigo_queries_v3';

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'apuracao' | 'clipping' | 'consultas'>('apuracao');
  const [cargoTab, setCargoTab] = useState<'governador' | 'depEstadual' | 'senador' | 'depFederal'>('governador');

  // Apuracao & Scrape State
  const [apuracao, setApuracao] = useState<ApuracaoData | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<Date | null>(null);

  // Queries
  const [queries, setQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_QUERIES;
  });

  const [newQueryInput, setNewQueryInput] = useState('');
  const [copiedQueryIndex, setCopiedQueryIndex] = useState<number | null>(null);

  // Automation / Cron State (10 min)
  const [cronEnabled, setCronEnabled] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [nextRunTimestamp, setNextRunTimestamp] = useState<number>(Date.now() + 10 * 60 * 1000);
  const [countdownSeconds, setCountdownSeconds] = useState(600);
  const [notifyEveryCycle, setNotifyEveryCycle] = useState(() => {
    return localStorage.getItem('monitor_notify_every_cycle') !== 'false';
  });
  const [notificationHistory, setNotificationHistory] = useState<Array<{ title: string; body: string; time: string }>>([]);

  // Robust Browser Notifications System
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeBannerAlert, setActiveBannerAlert] = useState<{ title: string; body: string; time: string } | null>(null);
  const titleFlashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOriginalTitleRef = useRef(true);
  const originalTitle = 'Monitor Carlos Burigo & Apuração Eleições RS 2026';

  // News items
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [feedSearchTerm, setFeedSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick search input
  const [quickSearchTerm, setQuickSearchTerm] = useState('"Carlos Burigo"');

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2800);
  };

  // Sound chime using Web Audio API (works 100% reliably, no external assets needed)
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First tone (587.33 Hz - D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);

      // Second tone (880 Hz - A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // audio error ignored
    }
  };

  // Title flashing for alerts
  const startTitleFlashing = (alertTitle: string) => {
    if (titleFlashIntervalRef.current) clearInterval(titleFlashIntervalRef.current);
    let count = 0;
    titleFlashIntervalRef.current = setInterval(() => {
      document.title = isOriginalTitleRef.current ? `🔔 ${alertTitle}` : originalTitle;
      isOriginalTitleRef.current = !isOriginalTitleRef.current;
      count++;
      if (count > 20) {
        clearInterval(titleFlashIntervalRef.current!);
        titleFlashIntervalRef.current = null;
        document.title = originalTitle;
      }
    }, 800);
  };

  // Check browser notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      setNotifPermission('unsupported');
    } else {
      setNotifPermission(Notification.permission);
    }

    const resetTitleOnFocus = () => {
      if (titleFlashIntervalRef.current) {
        clearInterval(titleFlashIntervalRef.current);
        titleFlashIntervalRef.current = null;
      }
      document.title = originalTitle;
    };

    window.addEventListener('focus', resetTitleOnFocus);
    return () => window.removeEventListener('focus', resetTitleOnFocus);
  }, []);

  // Dispatch resilient browser notification
  const triggerBrowserNotification = (title: string, body: string, url?: string) => {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    // 1. Play sound
    playAlertSound();

    // 2. Banner in-app alert
    setActiveBannerAlert({
      title,
      body,
      time: timeStr,
    });

    // 3. Save to notification history
    setNotificationHistory((prev) => [
      { title, body, time: timeStr },
      ...prev.slice(0, 14),
    ]);

    // 4. Tab title flash
    startTitleFlashing(title);

    // 5. Native OS notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: 'https://g1.globo.com/favicon.ico',
          tag: 'eleicoes-rs-' + Date.now(),
        });
        notif.onclick = () => {
          window.focus();
          if (url) window.open(url, '_blank');
        };
      } catch (err) {
        console.warn('Native notification restricted or blocked in iframe:', err);
      }
    }
  };

  // Request browser notification permission explicitly
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Este navegador não suporta notificações de área de trabalho.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === 'granted') {
        showToast('Notificações no navegador ativadas com sucesso!');
        triggerBrowserNotification(
          'Notificações Ativadas: Monitor Eleições RS',
          'Você receberá avisos em tempo real a cada atualização da apuração das eleições.',
          'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml'
        );
      } else if (permission === 'denied') {
        showToast('Permissão bloqueada no navegador. Desbloqueie nas permissões do site.');
      }
    } catch {
      showToast('Erro ao solicitar permissão de notificação.');
    }
  };

  // Test notification button
  const handleTestNotification = () => {
    triggerBrowserNotification(
      '🔔 Teste de Notificação: Apuração RS',
      `Urnas apuradas: ${apuracao?.urnas.andamento || '0,00'}% | Carlos Búrigo: ${apuracao?.carlosBurigo?.votos.quantidade || 0} votos`,
      'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml'
    );
    showToast('Disparo de teste realizado!');
  };

  // Fetch G1 Scraper & Election Data
  const fetchApuracaoData = async (triggerScrapeNow = false) => {
    setIsScraping(true);
    try {
      // Use GET with timestamp cache-buster to prevent 405 on edge/static hosting
      const endpoint = triggerScrapeNow
        ? `/api/scrape-now?t=${Date.now()}`
        : `/api/apuracao-rs?t=${Date.now()}`;
      const res = await fetch(endpoint, { method: 'GET' });

      if (res.ok) {
        const data = await res.json();
        if (data.apuracao) {
          const prevUrnas = apuracao?.urnas.andamento;
          const newUrnas = data.apuracao.urnas.andamento;
          const prevVotes = apuracao?.carlosBurigo?.votos.quantidade;
          const newVotes = data.apuracao.carlosBurigo?.votos.quantidade;

          const hasNumbersChanged =
            (prevUrnas && prevUrnas !== newUrnas) ||
            (prevVotes !== undefined && prevVotes !== newVotes);

          if (hasNumbersChanged) {
            triggerBrowserNotification(
              `🗳️ Urnas Avançaram no RS: ${newUrnas}%`,
              `Apuração atualizada no G1. Carlos Búrigo: ${data.apuracao.carlosBurigo?.votos.quantidade || 0} votos (${data.apuracao.carlosBurigo?.posicao || 73}º lugar).`,
              'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml'
            );
          } else if (notifyEveryCycle && triggerScrapeNow) {
            // Notification on every check cycle
            triggerBrowserNotification(
              `⏱️ Apuração G1 RS (Ciclo Concluído)`,
              `Urnas em ${newUrnas}% às ${new Date().toLocaleTimeString('pt-BR')}. Carlos Búrigo: ${data.apuracao.carlosBurigo?.votos.quantidade || 0} votos. Situação: ${data.apuracao.carlosBurigo?.statusDescricao || 'Em apuração'}.`,
              'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml'
            );
          }

          setApuracao(data.apuracao);
          setLastScrapeTime(new Date());
        }

        if (triggerScrapeNow) {
          showToast('Scrape do G1 concluído com sucesso!');
        }
      } else {
        // Fallback for static hosting (e.g. Vercel static)
        await fetchApuracaoDirectFallback(triggerScrapeNow);
      }
    } catch (err) {
      console.warn('Backend endpoint unavailable, falling back to direct G1 feed:', err);
      await fetchApuracaoDirectFallback(triggerScrapeNow);
    } finally {
      setIsScraping(false);
    }
  };

  // Direct G1 Fallback for static environments with CORS proxy fallback
  const fetchApuracaoDirectFallback = async (triggerScrapeNow = false) => {
    try {
      const fetchJsonWithFallback = async (url: string) => {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.json();
        } catch {
          // Direct fetch blocked by CORS, try proxy
        }
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
          const pRes = await fetch(proxyUrl);
          if (pRes.ok) {
            const data = await pRes.json();
            if (data.contents) return JSON.parse(data.contents);
          }
        } catch {
          // ignore
        }
        return null;
      };

      const [resExec, resDep] = await Promise.all([
        fetchJsonWithFallback('https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/executivo.json'),
        fetchJsonWithFallback('https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/deputado-estadual.json'),
      ]);

      const abrangencia = resExec?.abrangencia || resDep?.abrangencia || {};
      const andamentoStr = abrangencia.andamento || '0,00';
      const candsGov: Candidate[] = (resExec?.candidatos || []).map((c: any) => ({
        nome: c.nome,
        numero: c.numero,
        partido: c.partido,
        coligacao: c.coligacao,
        posicao: c.posicao || c.classificacao,
        votos: c.votos || { porcentagem: '0,00', quantidade: 0 },
        eleito: c.eleito || 'N',
        foto: c.foto,
      }));

      const allDep: Candidate[] = resDep?.candidatos || [];
      const burigo = allDep.find(
        (c) => c.numero === '15140' || c.nome.toLowerCase().includes('carlos búrigo')
      );

      const hasVotes = (burigo?.votos?.quantidade || 0) > 0;
      const carlosBurigoObj = {
        nome: burigo?.nome || 'Carlos Búrigo',
        numero: burigo?.numero || '15140',
        partido: burigo?.partido || 'MDB',
        cargo: 'Deputado Estadual (RS)',
        posicao: burigo?.posicao || 73,
        posicaoTipo: hasVotes ? ('ranking_votos' as const) : ('ordem_alfabetica' as const),
        posicaoExplicacao: hasVotes
          ? `${burigo?.posicao}º mais votado na apuração parcial`
          : '73º na ordem alfabética oficial do TSE (aguardando início da contagem de votos)',
        votos: burigo?.votos || { porcentagem: '0,00', quantidade: 0 },
        eleito: burigo?.eleito || 'N',
        destinacaoDosVotos: burigo?.destinacaoDosVotos || 'Válido',
        statusDescricao: burigo?.eleito === 'S' ? 'Eleito por QP' : 'Em apuração',
      };

      const fallbackData: ApuracaoData = {
        sourceUrl: 'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml',
        scrapedAt: new Date().toISOString(),
        pageMeta: {
          generatedAt: '04-10-2026 13:55:13',
          ssrState: 'voting-day',
          phase: 'durante',
          stateName: 'Rio Grande do Sul',
          uf: 'RS',
          year: '2026',
        },
        urnas: {
          andamento: andamentoStr,
          percentual: parseFloat(andamentoStr.replace(',', '.')) || 0,
          secoesTotalizadas: Number(abrangencia.secoesTotalizadas) || 0,
          secoes: Number(abrangencia.secoes) || 29840,
          eleitores: Number(abrangencia.eleitores) || 8526233,
          eleitoradoApurado: Number(abrangencia.eleitoradoApurado) || 0,
          totalizacaoFinal: Boolean(abrangencia.totalizacaoFinal),
          aguardandoApuracao: Boolean(abrangencia.aguardandoApuracao),
          votos: abrangencia.votos,
        },
        carlosBurigo: carlosBurigoObj,
        governador: candsGov,
        senador: [],
        deputadosEstaduaisDestaques: allDep.slice(0, 15),
        deputadosFederaisDestaques: [],
        totalCandidatosEstaduais: allDep.length,
        totalCandidatosFederais: 458,
        hasChangesSinceLastCheck: false,
      };

      setApuracao(fallbackData);
      setLastScrapeTime(new Date());

      if (notifyEveryCycle && triggerScrapeNow) {
        triggerBrowserNotification(
          `⏱️ Apuração G1 RS (Ciclo Concluído)`,
          `Urnas em ${andamentoStr}% às ${new Date().toLocaleTimeString('pt-BR')}. Carlos Búrigo: ${carlosBurigoObj.votos.quantidade} votos. Situação: Em apuração.`,
          'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml'
        );
      }
      if (triggerScrapeNow) {
        showToast('Apuração atualizada via feed G1!');
      }
    } catch {
      showToast('Erro ao carregar dados do G1.');
    }
  };

  // Fetch news feed and synchronization
  const fetchFeed = async (triggerImmediate = false) => {
    try {
      // Use GET with query string to avoid 405 Method Not Allowed on edge/static hosting
      const endpoint = triggerImmediate
        ? `/api/check-now?t=${Date.now()}`
        : `/api/feed?t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setNewsItems(data.items);
        }
        if (data.apuracao) {
          setApuracao(data.apuracao);
          setLastScrapeTime(new Date());
        }

        const nextMs = Date.now() + intervalMinutes * 60 * 1000;
        setNextRunTimestamp(nextMs);
        setCountdownSeconds(intervalMinutes * 60);

        if (triggerImmediate) {
          showToast('Varredura completa concluída (Apuração G1 + Clipping)!');
        }
      }
    } catch (err) {
      console.error('Failed to query feed:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchApuracaoData(false);
    fetchFeed(false);
  }, []);

  // Sync queries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_QUERIES, JSON.stringify(queries));
    } catch {
      // ignore
    }
  }, [queries]);

  // Update cron interval
  const updateCronConfig = async (enabled: boolean, minutes: number) => {
    setCronEnabled(enabled);
    setIntervalMinutes(minutes);
    const nextMs = Date.now() + minutes * 60 * 1000;
    setNextRunTimestamp(nextMs);
    setCountdownSeconds(minutes * 60);

    try {
      await fetch('/api/cron-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          intervalMinutes: minutes,
          queries,
        }),
      });
    } catch {
      // server sync error
    }
  };

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!cronEnabled) return;

      const remaining = Math.max(0, Math.round((nextRunTimestamp - Date.now()) / 1000));
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        // Trigger automated cron run
        fetchApuracaoData(true);
        fetchFeed(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cronEnabled, nextRunTimestamp, intervalMinutes, apuracao]);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add query
  const handleAddQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQueryInput.trim();
    if (!trimmed) return;
    if (queries.includes(trimmed)) {
      showToast('Esta consulta já está na lista.');
      return;
    }
    const updated = [...queries, trimmed];
    setQueries(updated);
    setNewQueryInput('');
    showToast('Consulta adicionada ao monitoramento.');
  };

  const handleDeleteQuery = (index: number) => {
    const updated = queries.filter((_, idx) => idx !== index);
    setQueries(updated);
  };

  const handleCopyQuery = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQueryIndex(index);
      showToast(`Copiado: ${text}`);
      setTimeout(() => setCopiedQueryIndex(null), 2000);
    } catch {
      showToast('Falha ao copiar');
    }
  };

  const executeExternalSearch = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filtered news items
  const filteredNews = useMemo(() => {
    return newsItems.filter((item) => {
      if (!feedSearchTerm) return true;
      const s = feedSearchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(s) ||
        item.source.toLowerCase().includes(s) ||
        item.snippet.toLowerCase().includes(s)
      );
    });
  }, [newsItems, feedSearchTerm]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans antialiased flex flex-col justify-between">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-md shadow-2xl border border-neutral-700 flex items-center gap-2 animate-fade-in"
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating In-App Banner Alert for Live Apuração Changes */}
      {activeBannerAlert && (
        <div className="bg-red-700 text-white px-4 py-3 shadow-md border-b border-red-800 transition-all sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-1.5 bg-red-800 rounded-full animate-bounce">
                <BellRing className="w-4 h-4 text-amber-300" />
              </span>
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span>{activeBannerAlert.title}</span>
                  <span className="text-[11px] font-normal opacity-75">às {activeBannerAlert.time}</span>
                </p>
                <p className="text-xs text-red-100 mt-0.5">{activeBannerAlert.body}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold bg-white text-red-700 hover:bg-neutral-100 px-3 py-1.5 rounded transition-colors"
              >
                Abrir no G1
              </a>
              <button
                type="button"
                onClick={() => setActiveBannerAlert(null)}
                className="text-xs text-red-200 hover:text-white px-2 py-1 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-10 flex-1">
        {/* Header */}
        <header className="border-b border-neutral-300 pb-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                  G1 Scraper &bull; RS 2026
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cron a cada {intervalMinutes} min
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-1">
                Monitor Carlos Búrigo &bull; Apuração Eleições RS 2026
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1">
                Scrape em tempo real da apuração oficial do G1/TSE e monitoramento de menções públicas.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <PWAInstallButton />

              <button
                type="button"
                onClick={() => {
                  fetchApuracaoData(true);
                  fetchFeed(true);
                }}
                disabled={isScraping}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-md shadow-xs transition-colors cursor-pointer"
                title="Raspar G1 agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Raspando G1...' : 'Atualizar G1 Agora'}</span>
              </button>

              <a
                href="https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium bg-white hover:bg-neutral-50 text-neutral-800 px-3 py-2 rounded-md border border-neutral-300 transition-colors"
                title="Ver página original do G1"
              >
                <span>Página G1</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </a>
            </div>
          </div>
        </header>

        {/* LIVE BROADCAST PLAYER (RÁDIO CAXIAS NAS ELEIÇÕES 2026 - AsQb4t_7E9w) COM SOBREPOSIÇÃO DE TELA */}
        <LiveBroadcastPlayer
          videoId="AsQb4t_7E9w"
          streamTitle="RÁDIO CAXIAS NAS ELEIÇÕES 2026"
          channelName="Caxias Play / Rádio Caxias"
        />

        {/* SECTION: Automated Cron & Resilient Browser Notifications Bar */}
        <section aria-labelledby="notification-cron-heading" className="mb-6">
          <div className="bg-white border border-neutral-300 rounded-lg p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Cron info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="w-4 h-4 text-neutral-700" />
                  <span className="text-sm font-bold text-neutral-900">
                    Automação de Scrape & Monitoramento
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium">
                    {cronEnabled ? `Execução a cada ${intervalMinutes} minutos` : 'Cron Pausado'}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
                  <span>
                    Próxima varredura automática em:{' '}
                    <strong className="font-mono text-neutral-900 text-sm">
                      {cronEnabled ? formatCountdown(countdownSeconds) : '--:--'}
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Último scrape G1:{' '}
                    <strong>
                      {lastScrapeTime ? lastScrapeTime.toLocaleTimeString('pt-BR') : 'Carregando...'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Notification System Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Notify Every Cycle Toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-md border border-neutral-300 transition-colors" title="Receber aviso sonoro e notificação toda vez que o cron fizer checagem">
                  <input
                    type="checkbox"
                    checked={notifyEveryCycle}
                    onChange={(e) => {
                      setNotifyEveryCycle(e.target.checked);
                      localStorage.setItem('monitor_notify_every_cycle', String(e.target.checked));
                      showToast(e.target.checked ? 'Notificações ativadas a cada ciclo do cron!' : 'Notificações apenas quando houver alteração.');
                    }}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-neutral-800">
                    Notificar a cada atualização
                  </span>
                </label>

                {/* Browser permission button */}
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                    notifPermission === 'granted'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : notifPermission === 'denied'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  }`}
                  title="Gerenciar permissão de notificação no navegador"
                >
                  {notifPermission === 'granted' ? (
                    <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span>
                    {notifPermission === 'granted'
                      ? 'Browser: Notificações Ativas'
                      : notifPermission === 'denied'
                      ? 'Browser: Bloqueadas (Clique p/ info)'
                      : 'Autorizar no Browser'}
                  </span>
                </button>

                {/* Test notification button */}
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2.5 py-1.5 rounded-md border border-neutral-300 transition-colors cursor-pointer"
                  title="Disparar um som e notificação de teste"
                >
                  <span>Testar Notificação</span>
                </button>

                {/* Sound toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    showToast(soundEnabled ? 'Alerta sonoro desativado' : 'Alerta sonoro ativado');
                  }}
                  className={`p-1.5 rounded-md border cursor-pointer ${
                    soundEnabled
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-300'
                  }`}
                  title={soundEnabled ? 'Som ativado' : 'Som desativado'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Pause / Resume Cron */}
                <button
                  type="button"
                  onClick={() => updateCronConfig(!cronEnabled, intervalMinutes)}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-2.5 py-1.5 rounded-md border border-neutral-300 transition-colors cursor-pointer"
                >
                  {cronEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{cronEnabled ? 'Pausar Cron' : 'Retomar'}</span>
                </button>
              </div>
            </div>

            {/* Frequency options */}
            <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-neutral-700">Intervalo do Cron:</span>
                {[5, 10, 15, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateCronConfig(cronEnabled, m)}
                    className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                      intervalMinutes === m
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {m} min {m === 10 ? '(padrão)' : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>Scraper conectado a: g1.globo.com &bull; Dados Oficiais TSE</span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-300 mb-6 bg-white rounded-t-md px-2 pt-2 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('apuracao')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'apuracao'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Resultados das Eleições RS</span>
            <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono">
              {apuracao?.urnas.andamento || '0,00'}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clipping')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'clipping'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>Clipping de Notícias</span>
            <span className="text-[11px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-mono">
              {newsItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('consultas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'consultas'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Consultas & Google Alerts</span>
          </button>
        </div>

        {/* TAB 1: RESULTADOS DAS ELEIÇÕES RS (G1 SCRAPER) */}
        {activeTab === 'apuracao' && (
          <div>
            {/* Top Stat Cards: Urnas Apuradas & Carlos Búrigo Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Urnas Totais */}
              <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-xs md:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Urnas Apuradas (RS)
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded">
                    1º Turno
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-neutral-900">
                    {apuracao?.urnas.andamento || '0,00'}%
                  </span>
                  <span className="text-xs text-neutral-500">das seções</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-red-600 h-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0.5, apuracao?.urnas.percentual || 0))}%` }}
                  ></div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-600 border-t border-neutral-100 pt-2">
                  <span>Total de Eleitores:</span>
                  <strong className="text-neutral-900">
                    {(apuracao?.urnas.eleitores || 8526233).toLocaleString('pt-BR')}
                  </strong>
                </div>
              </div>

              {/* Destaque Carlos Búrigo */}
              <div className="bg-white border-2 border-red-600 rounded-lg p-4 shadow-xs md:col-span-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-bl">
                  CANDIDATO MONITORADO
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-extrabold text-neutral-900">
                        {apuracao?.carlosBurigo?.nome || 'Carlos Búrigo'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
                        Nº {apuracao?.carlosBurigo?.numero || '15140'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {apuracao?.carlosBurigo?.partido || 'MDB'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">
                      Disputa: <strong>{apuracao?.carlosBurigo?.cargo || 'Deputado Estadual (RS)'}</strong> &bull; Situação:{' '}
                      <span className="font-semibold text-neutral-800">
                        {apuracao?.carlosBurigo?.statusDescricao || 'Em apuração'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-neutral-50 px-4 py-2 rounded-md border border-neutral-200 self-start sm:self-auto">
                    <div>
                      <span className="block text-[11px] font-medium text-neutral-500 uppercase">
                        Votos Computados
                      </span>
                      <span className="text-xl font-bold text-neutral-900">
                        {(apuracao?.carlosBurigo?.votos.quantidade || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="border-l border-neutral-300 pl-4">
                      <span className="block text-[11px] font-medium text-neutral-500 uppercase">
                        Percentual
                      </span>
                      <span className="text-xl font-bold text-red-600">
                        {apuracao?.carlosBurigo?.votos.porcentagem || '0,00'}%
                      </span>
                    </div>
                    <div className="border-l border-neutral-300 pl-4">
                      <span className="block text-[11px] font-medium text-neutral-500 uppercase">
                        Posição TSE
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-neutral-800">
                          {apuracao?.carlosBurigo?.posicao || 73}º
                        </span>
                        <span className="text-[10px] text-neutral-500 font-medium">
                          {(apuracao?.carlosBurigo?.votos.quantidade || 0) > 0 ? 'mais votado' : '(ordem alfabética)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clarification Callout regarding position 73º */}
                <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Origem da Posição 73º:</strong> Trata-se da posição nominal de Carlos Búrigo na <strong>ordem alfabética oficial do TSE</strong> entre os 542 candidatos a deputado estadual no RS (registrado logo após <em>Carlos Breik</em> e antes de <em>Carlos Da Caixa D&apos;água</em>). <u>Não é dado de pesquisa eleitoral nem resultado prévio</u>. Conforme as urnas forem apuradas e os votos totalizados, este campo exibirá a <strong>classificação real de mais votados</strong>.
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-500">
                  <span>
                    Destinação dos votos: <strong>{apuracao?.carlosBurigo?.destinacaoDosVotos || 'Válido'}</strong>
                  </span>
                  <span className="text-red-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                    Acompanhamento prioritário &bull; Notificação a cada atualização
                  </span>
                </div>
              </div>
            </div>

            {/* Cargo Selector Tabs */}
            <div className="bg-white border border-neutral-300 rounded-lg p-5 shadow-xs mb-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-600" />
                  <h2 className="text-base font-bold text-neutral-900">
                    Resultados por Cargo &bull; Rio Grande do Sul
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCargoTab('governador')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      cargoTab === 'governador'
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Governador ({apuracao?.governador.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCargoTab('depEstadual')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      cargoTab === 'depEstadual'
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Dep. Estadual ({apuracao?.totalCandidatosEstaduais || 542})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCargoTab('senador')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      cargoTab === 'senador'
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Senador ({apuracao?.senador.length || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCargoTab('depFederal')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      cargoTab === 'depFederal'
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Dep. Federal ({apuracao?.totalCandidatosFederais || 458})
                  </button>
                </div>
              </div>

              {/* CARGO: GOVERNADOR */}
              {cargoTab === 'governador' && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(apuracao?.governador || []).map((cand, idx) => (
                      <div
                        key={`${cand.numero}-${idx}`}
                        className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                      >
                        {cand.foto ? (
                          <img
                            src={cand.foto}
                            alt={cand.nome}
                            className="w-12 h-12 rounded-full object-cover border border-neutral-300 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-neutral-600 shrink-0">
                            {cand.nome.charAt(0)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-sm text-neutral-900 truncate">
                              {cand.nome}
                            </span>
                            <span className="text-sm font-extrabold text-red-600 shrink-0">
                              {cand.votos.porcentagem}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                            <span className="font-semibold text-neutral-700">{cand.partido}</span>
                            <span>&bull;</span>
                            <span>Nº {cand.numero}</span>
                            {cand.coligacao && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate">{cand.coligacao}</span>
                              </>
                            )}
                          </div>

                          <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-2">
                            <div
                              className="bg-red-600 h-full"
                              style={{ width: `${Math.max(1, parseFloat(cand.votos.porcentagem.replace(',', '.')) || 0)}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                            <span>{cand.votos.quantidade.toLocaleString('pt-BR')} votos</span>
                            <span className="font-medium">
                              {cand.eleito === 'S' ? 'Eleito' : cand.destinacaoDosVotos || 'Válido'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CARGO: DEPUTADO ESTADUAL (COM CARLOS BURIGO) */}
              {cargoTab === 'depEstadual' && (
                <div className="mt-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      Exibindo destaques e candidatos monitorados. Total de <strong>{apuracao?.totalCandidatosEstaduais || 542}</strong> candidatos registrados para a Assembleia Legislativa do RS.
                    </span>
                    <span className="font-bold text-amber-800">
                      Carlos Búrigo: Nº 15140 (MDB)
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-md overflow-hidden bg-white">
                    {(apuracao?.deputadosEstaduaisDestaques || []).map((cand, idx) => {
                      const isBurigo = cand.numero === '15140' || cand.nome.toLowerCase().includes('burigo');
                      return (
                        <div
                          key={`${cand.numero}-${idx}`}
                          className={`p-3.5 flex items-center justify-between gap-3 ${
                            isBurigo ? 'bg-red-50 border-l-4 border-l-red-600' : 'hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500">
                              {cand.posicao || idx + 1}º
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isBurigo ? 'text-red-700 font-extrabold' : 'text-neutral-900'}`}>
                                  {cand.nome}
                                </span>
                                {isBurigo && (
                                  <span className="text-[10px] uppercase font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded">
                                    Monitorado
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-neutral-500">
                                {cand.partido} &bull; Nº {cand.numero} &bull; {cand.destinacaoDosVotos || 'Válido'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="block font-bold text-sm text-neutral-900">
                              {cand.votos.porcentagem}%
                            </span>
                            <span className="text-xs text-neutral-500">
                              {cand.votos.quantidade.toLocaleString('pt-BR')} votos
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CARGO: SENADOR */}
              {cargoTab === 'senador' && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(apuracao?.senador || []).map((cand, idx) => (
                    <div
                      key={`${cand.numero}-${idx}`}
                      className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-sm text-neutral-900 block">{cand.nome}</span>
                        <span className="text-xs text-neutral-500">
                          {cand.partido} &bull; Nº {cand.numero}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-red-600 block">{cand.votos.porcentagem}%</span>
                        <span className="text-xs text-neutral-500">{cand.votos.quantidade.toLocaleString('pt-BR')} votos</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CARGO: DEPUTADO FEDERAL */}
              {cargoTab === 'depFederal' && (
                <div className="mt-4 divide-y divide-neutral-200 border border-neutral-200 rounded-md overflow-hidden bg-white">
                  {(apuracao?.deputadosFederaisDestaques || []).map((cand, idx) => (
                    <div key={`${cand.numero}-${idx}`} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                      <div>
                        <span className="font-bold text-sm text-neutral-900 block">{cand.nome}</span>
                        <span className="text-xs text-neutral-500">{cand.partido} &bull; Nº {cand.numero}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-neutral-900 block">{cand.votos.porcentagem}%</span>
                        <span className="text-xs text-neutral-500">{cand.votos.quantidade.toLocaleString('pt-BR')} votos</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLIPPING DE NOTÍCIAS */}
        {activeTab === 'clipping' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Clipping & Feed de Notícias
                </h2>
                <p className="text-xs text-neutral-600">
                  Notícias coletadas automaticamente nos ciclos de 10 minutos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/export?format=txt"
                  download="monitor-carlos-burigo.txt"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar TXT</span>
                </a>
                <a
                  href="/api/export?format=csv"
                  download="monitor-carlos-burigo.csv"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </a>
              </div>
            </div>

            {/* Filter input */}
            <div className="mb-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={feedSearchTerm}
                onChange={(e) => setFeedSearchTerm(e.target.value)}
                placeholder="Filtrar matérias por veículo, assunto ou palavra-chave..."
                className="w-full bg-white border border-neutral-300 rounded-md pl-9 pr-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Items list */}
            <div className="bg-white border border-neutral-300 rounded-lg divide-y divide-neutral-200 shadow-xs max-h-[560px] overflow-y-auto">
              {filteredNews.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm">
                  Nenhuma notícia encontrada com este termo.
                </div>
              ) : (
                filteredNews.map((it) => (
                  <article key={it.id} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            {it.source}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {new Date(it.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                          {it.isNew && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Novo
                            </span>
                          )}
                        </div>
                        <a
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-neutral-900 hover:text-red-700 leading-snug block"
                        >
                          {it.title}
                        </a>
                        {it.snippet && (
                          <p className="text-xs text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                            {it.snippet}
                          </p>
                        )}
                      </div>

                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-2.5 py-1.5 rounded transition-colors shrink-0"
                      >
                        <span>Ler</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONSULTAS & GOOGLE ALERTS */}
        {activeTab === 'consultas' && (
          <div>
            {/* Consultas Monitoradas */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    Termos & Consultas Rastreadas pelo Cron
                  </h2>
                  <p className="text-xs text-neutral-600">
                    Estes termos são varridos a cada 10 minutos e podem ser copiados para o Google Alerts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQueries(DEFAULT_QUERIES)}
                  className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  Restaurar padrões
                </button>
              </div>

              <div className="bg-white border border-neutral-300 rounded-md divide-y divide-neutral-200 shadow-xs mb-3">
                {queries.map((q, idx) => (
                  <div key={`${q}-${idx}`} className="p-3 flex items-center justify-between">
                    <code className="text-xs sm:text-sm font-mono text-neutral-800 break-all select-all">
                      {q}
                    </code>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyQuery(q, idx)}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded cursor-pointer ${
                          copiedQueryIndex === idx
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {copiedQueryIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedQueryIndex === idx ? 'Copiado' : 'Copiar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => executeExternalSearch(`https://www.google.com/search?q=${encodeURIComponent(q)}`)}
                        className="p-1 text-neutral-400 hover:text-neutral-700"
                        title="Ver no Google"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {queries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuery(idx)}
                          className="p-1 text-neutral-300 hover:text-red-600"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddQuery} className="flex gap-2">
                <input
                  type="text"
                  value={newQueryInput}
                  onChange={(e) => setNewQueryInput(e.target.value)}
                  placeholder='Adicionar nova consulta (ex: "Carlos Burigo" votos)'
                  className="flex-1 bg-white border border-neutral-300 rounded px-3.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="submit"
                  disabled={!newQueryInput.trim()}
                  className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>
            </section>

            {/* Pesquisa Rápida */}
            <section className="mb-8 bg-white border border-neutral-300 rounded-lg p-5 shadow-xs">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                Pesquisa rápida manual
              </h2>
              <p className="text-xs text-neutral-600 mb-3">
                Busca instantânea no Google, YouTube e redes sociais.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeExternalSearch(`https://www.google.com/search?q=${encodeURIComponent(quickSearchTerm.trim() || '"Carlos Burigo"')}`);
                }}
                className="flex flex-col sm:flex-row gap-2 mb-3"
              >
                <input
                  type="text"
                  value={quickSearchTerm}
                  onChange={(e) => setQuickSearchTerm(e.target.value)}
                  className="flex-1 bg-neutral-50 border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900"
                  placeholder="Termo de busca..."
                />
                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded shrink-0 cursor-pointer"
                >
                  Pesquisar no Google
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    executeExternalSearch(`https://www.google.com/search?q=${encodeURIComponent(quickSearchTerm.trim() || '"Carlos Burigo"')}&tbm=nws`)
                  }
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Notícias</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeExternalSearch(`https://www.google.com/search?q=${encodeURIComponent(quickSearchTerm.trim() || '"Carlos Burigo"')}`)
                  }
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeExternalSearch(`https://www.youtube.com/results?search_query=${encodeURIComponent(quickSearchTerm.trim() || '"Carlos Burigo"')}`)
                  }
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    executeExternalSearch(
                      `https://www.google.com/search?q=${encodeURIComponent(
                        `${quickSearchTerm.trim() || '"Carlos Burigo"'} (site:instagram.com OR site:facebook.com OR site:x.com OR site:twitter.com)`
                      )}`
                    )
                  }
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Redes</span>
                </button>
              </div>
            </section>

            {/* Google Alerts */}
            <section className="bg-white border border-neutral-300 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Google Alerts (Alertas por E-mail)
                </h2>
                <p className="text-xs text-neutral-600 max-w-lg mt-0.5">
                  Copie uma das consultas acima e cadastre no Google Alerts oficial para receber e-mails automáticos no seu Gmail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => executeExternalSearch('https://www.google.com/alerts')}
                className="inline-flex items-center gap-2 border border-neutral-300 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-neutral-900 text-sm font-semibold px-4 py-2 rounded shrink-0 cursor-pointer"
              >
                <span>Abrir Google Alerts</span>
                <ExternalLink className="w-4 h-4 text-neutral-500" />
              </button>
            </section>
          </div>
        )}
        {/* SECTION: Registro de Notificações do Monitor */}
        {notificationHistory.length > 0 && (
          <section className="mt-8 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-600" />
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Histórico de Notificações Disparadas ({notificationHistory.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificationHistory([])}
                className="text-[11px] text-neutral-400 hover:text-red-600 cursor-pointer"
              >
                Limpar histórico
              </button>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {notificationHistory.map((item, i) => (
                <div key={i} className="text-xs flex items-baseline justify-between gap-3 text-neutral-600 py-1 border-b border-neutral-100 last:border-0">
                  <span className="truncate">
                    <strong className="text-neutral-900">{item.title}:</strong> {item.body}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-300 py-4 text-center text-xs text-neutral-500 bg-white">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Monitor Carlos Búrigo &bull; Scrape G1 Eleições RS 2026 &bull; Cron 10 Minutos</span>
          <span className="text-neutral-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fonte oficial: G1 / Tribunal Superior Eleitoral
          </span>
        </div>
      </footer>
      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
