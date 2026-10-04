import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface NewsItem {
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

export interface CandidateVote {
  porcentagem: string;
  quantidade: number;
}

export interface Candidate {
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

export interface ApuracaoData {
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
    posicaoTipo: 'ordem_alfabetica' | 'ranking_votos';
    posicaoExplicacao: string;
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

const G1_RS_PAGE_URL = 'https://g1.globo.com/politica/eleicoes/2026/apuracao/rio-grande-do-sul.ghtml';
const G1_API_EXECUTIVO = 'https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/executivo.json';
const G1_API_DEP_ESTADUAL = 'https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/deputado-estadual.json';
const G1_API_SENADOR = 'https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/senador.json';
const G1_API_DEP_FEDERAL = 'https://s.glbimg.com/jo/el/2026/apuracao/1-turno/rs/deputado-federal.json';

interface CronState {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  totalRuns: number;
  isChecking: boolean;
  queries: string[];
}

const cronState: CronState = {
  enabled: true,
  intervalMinutes: 10,
  lastRunAt: null,
  nextRunAt: null,
  totalRuns: 0,
  isChecking: false,
  queries: [
    '"Carlos Burigo"',
    '"Carlos Burigo" deputado',
    '"Carlos Burigo" política',
    '"Carlos Burigo" eleições',
    '"Carlos Burigo" apuração',
    '"Carlos Burigo" votação',
    '"Carlos Burigo" notícia'
  ],
};

let detectedItems: NewsItem[] = [];
let latestApuracao: ApuracaoData | null = null;
let previousUrnasPercent = '0,00';
let previousBurigoVotes = 0;
let cronTimer: NodeJS.Timeout | null = null;

// Parse simple RSS XML items safely without heavy external dependencies
function parseGoogleNewsRSS(xml: string, query: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1];
    const titleMatch = /<title>(.*?)<\/title>/i.exec(itemBlock);
    const linkMatch = /<link>(.*?)<\/link>/i.exec(itemBlock);
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(itemBlock);
    const sourceMatch = /<source[^>]*>(.*?)<\/source>/i.exec(itemBlock);
    const guidMatch = /<guid[^>]*>(.*?)<\/guid>/i.exec(itemBlock);
    const descMatch = /<description>(.*?)<\/description>/i.exec(itemBlock);

    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    const rawLink = linkMatch ? linkMatch[1].trim() : '';
    const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const rawSource = sourceMatch ? sourceMatch[1].trim() : 'Google News';
    const guid = guidMatch ? guidMatch[1].trim() : rawLink;

    if (!rawTitle || !rawLink) continue;

    const cleanTitle = rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const rawDesc = descMatch ? descMatch[1] : '';
    const cleanSnippet = rawDesc
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();

    const id = guid || Buffer.from(`${cleanTitle}-${rawSource}`).toString('base64');
    const timestamp = rawPubDate ? new Date(rawPubDate).getTime() : Date.now();

    items.push({
      id,
      title: cleanTitle,
      link: rawLink,
      pubDate: rawPubDate || new Date().toISOString(),
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
      source: rawSource,
      snippet: cleanSnippet.slice(0, 220),
      query,
      firstSeenAt: new Date().toISOString(),
    });
  }

  return items;
}

async function fetchNewsForQuery(query: string): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRSS(xml, query);
  } catch (err) {
    console.error(`Error fetching news for query "${query}":`, err);
    return [];
  }
}

// Scrape G1 page & live apuração endpoints
export async function scrapeG1ApuracaoRS(): Promise<ApuracaoData> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/json,*/*',
  };

  // 1. Scrape HTML page
  let pageMeta = {
    generatedAt: '04-10-2026 13:55:13',
    ssrState: 'voting-day',
    phase: 'durante',
    stateName: 'Rio Grande do Sul',
    uf: 'RS',
    year: '2026',
  };

  try {
    const pageRes = await fetch(G1_RS_PAGE_URL, { headers });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const genMatch = html.match(/data-generated-at="([^"]+)"/);
      const stateMatch = html.match(/data-apc-ssr-state="([^"]+)"/);
      const phaseMatch = html.match(/data-phase="([^"]+)"/);
      if (genMatch) pageMeta.generatedAt = genMatch[1];
      if (stateMatch) pageMeta.ssrState = stateMatch[1];
      if (phaseMatch) pageMeta.phase = phaseMatch[1];
    }
  } catch (err) {
    console.error('Error fetching G1 HTML:', err);
  }

  // 2. Fetch official G1 JSON feeds concurrently
  let execJson: any = null;
  let depEstadualJson: any = null;
  let senadorJson: any = null;
  let depFederalJson: any = null;

  try {
    const [resExec, resDepEst, resSen, resDepFed] = await Promise.all([
      fetch(G1_API_EXECUTIVO, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(G1_API_DEP_ESTADUAL, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(G1_API_SENADOR, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(G1_API_DEP_FEDERAL, { headers }).then((r) => (r.ok ? r.json() : null)),
    ]);

    execJson = resExec;
    depEstadualJson = resDepEst;
    senadorJson = resSen;
    depFederalJson = resDepFed;
  } catch (err) {
    console.error('Error fetching G1 election JSON feeds:', err);
  }

  // Extract Urnas and summary
  const abrangencia = execJson?.abrangencia || depEstadualJson?.abrangencia || {};
  const andamentoStr = abrangencia.andamento || '0,00';
  const percentualNum = parseFloat(andamentoStr.replace(',', '.')) || 0;

  const urnas = {
    andamento: andamentoStr,
    percentual: percentualNum,
    secoesTotalizadas: Number(abrangencia.secoesTotalizadas) || 0,
    secoes: Number(abrangencia.secoes) || 29840,
    eleitores: Number(abrangencia.eleitores) || 8526233,
    eleitoradoApurado: Number(abrangencia.eleitoradoApurado) || 0,
    totalizacaoFinal: Boolean(abrangencia.totalizacaoFinal),
    aguardandoApuracao: Boolean(abrangencia.aguardandoApuracao),
    votos: abrangencia.votos,
  };

  // Find Carlos Búrigo in Deputado Estadual
  let carlosBurigoObj: ApuracaoData['carlosBurigo'] = null;
  let allDepEstaduais: Candidate[] = depEstadualJson?.candidatos || [];

  const foundBurigo = allDepEstaduais.find(
    (c) =>
      c.numero === '15140' ||
      c.nome.toLowerCase().includes('carlos búrigo') ||
      c.nome.toLowerCase().includes('carlos burigo')
  );

  if (foundBurigo) {
    const hasVotes = (foundBurigo.votos?.quantidade || 0) > 0;
    carlosBurigoObj = {
      nome: foundBurigo.nome,
      numero: foundBurigo.numero,
      partido: foundBurigo.partido,
      cargo: 'Deputado Estadual (RS)',
      posicao: foundBurigo.posicao || 73,
      posicaoTipo: hasVotes ? 'ranking_votos' : 'ordem_alfabetica',
      posicaoExplicacao: hasVotes
        ? `${foundBurigo.posicao || 1}º mais votado na apuração parcial`
        : `73º na ordem alfabética oficial do TSE (aguardando início da contagem de votos)`,
      votos: foundBurigo.votos || { porcentagem: '0,00', quantidade: 0 },
      eleito: foundBurigo.eleito || 'N',
      destinacaoDosVotos: foundBurigo.destinacaoDosVotos || 'Válido',
      statusDescricao:
        foundBurigo.eleito === 'S'
          ? 'Eleito por QP'
          : foundBurigo.eleito === 'N'
          ? 'Em apuração'
          : 'Suplente',
    };
  } else {
    carlosBurigoObj = {
      nome: 'Carlos Búrigo',
      numero: '15140',
      partido: 'MDB',
      cargo: 'Deputado Estadual (RS)',
      posicao: 73,
      posicaoTipo: 'ordem_alfabetica',
      posicaoExplicacao: '73º na ordem alfabética oficial do TSE (aguardando início da contagem de votos)',
      votos: { porcentagem: '0,00', quantidade: 0 },
      eleito: 'N',
      destinacaoDosVotos: 'Válido',
      statusDescricao: 'Em apuração',
    };
  }

  // Format Governador candidates
  const governadorList: Candidate[] = (execJson?.candidatos || []).map((c: any) => ({
    nome: c.nome,
    numero: c.numero,
    partido: c.partido,
    coligacao: c.coligacao,
    posicao: c.posicao || c.classificacao,
    classificacao: c.classificacao,
    votos: c.votos || { porcentagem: '0,00', quantidade: 0 },
    eleito: c.eleito || 'N',
    matEleito: c.matEleito,
    matPerdedor: c.matPerdedor,
    destinacaoDosVotos: c.destinacaoDosVotos,
    foto: c.foto,
  }));

  // Format Senador candidates
  const senadorList: Candidate[] = (senadorJson?.candidatos || []).map((c: any) => ({
    nome: c.nome,
    numero: c.numero,
    partido: c.partido,
    coligacao: c.coligacao,
    posicao: c.posicao,
    votos: c.votos || { porcentagem: '0,00', quantidade: 0 },
    eleito: c.eleito || 'N',
    foto: c.foto,
  }));

  // Top Deputados Estaduais + Carlos Búrigo
  const depEstaduaisTop: Candidate[] = allDepEstaduais.slice(0, 15);
  // Ensure Burigo is present in the list if not in top 15
  if (foundBurigo && !depEstaduaisTop.some((c) => c.numero === '15140')) {
    depEstaduaisTop.push(foundBurigo);
  }

  const depFederaisTop: Candidate[] = (depFederalJson?.candidatos || []).slice(0, 15);

  // Check changes
  let hasChanges = false;
  let changeDesc = '';

  if (previousUrnasPercent !== andamentoStr) {
    hasChanges = true;
    changeDesc = `Urnas apuradas no RS avançaram de ${previousUrnasPercent}% para ${andamentoStr}%.`;
    previousUrnasPercent = andamentoStr;
  }

  if (carlosBurigoObj && carlosBurigoObj.votos.quantidade !== previousBurigoVotes) {
    hasChanges = true;
    changeDesc += ` Carlos Búrigo: ${carlosBurigoObj.votos.quantidade} votos (${carlosBurigoObj.votos.porcentagem}%).`;
    previousBurigoVotes = carlosBurigoObj.votos.quantidade;
  }

  const result: ApuracaoData = {
    sourceUrl: G1_RS_PAGE_URL,
    scrapedAt: new Date().toISOString(),
    dataHoraTse: execJson?.dataHora || depEstadualJson?.dataHora,
    dataRecebimento: execJson?.dataRecebimento || depEstadualJson?.dataRecebimento,
    pageMeta,
    urnas,
    carlosBurigo: carlosBurigoObj,
    governador: governadorList,
    senador: senadorList,
    deputadosEstaduaisDestaques: depEstaduaisTop,
    deputadosFederaisDestaques: depFederaisTop,
    totalCandidatosEstaduais: allDepEstaduais.length,
    totalCandidatosFederais: depFederalJson?.candidatos?.length || 0,
    hasChangesSinceLastCheck: hasChanges,
    lastChangeDescription: changeDesc,
  };

  latestApuracao = result;
  return result;
}

// Monitoring Cycle: News + Apuração Scrape
async function runMonitoringCycle(): Promise<{ newItemsCount: number; totalItems: number; apuracao: ApuracaoData | null }> {
  if (cronState.isChecking) {
    return { newItemsCount: 0, totalItems: detectedItems.length, apuracao: latestApuracao };
  }

  cronState.isChecking = true;
  let newItemsCount = 0;

  try {
    const now = new Date();
    cronState.lastRunAt = now.toISOString();
    cronState.totalRuns += 1;

    // 1. Scrape G1 Apuração
    await scrapeG1ApuracaoRS();

    // 2. Fetch News
    const queriesToCheck = cronState.queries.slice(0, 5);
    const results = await Promise.all(queriesToCheck.map((q) => fetchNewsForQuery(q)));

    const freshMap = new Map<string, NewsItem>();
    for (const item of detectedItems) {
      freshMap.set(item.title.toLowerCase().trim(), { ...item, isNew: false });
    }

    for (const list of results) {
      for (const item of list) {
        const key = item.title.toLowerCase().trim();
        if (!freshMap.has(key)) {
          newItemsCount += 1;
          freshMap.set(key, { ...item, isNew: true });
        }
      }
    }

    detectedItems = Array.from(freshMap.values()).sort((a, b) => b.timestamp - a.timestamp);
    if (detectedItems.length > 100) {
      detectedItems = detectedItems.slice(0, 100);
    }
  } catch (err) {
    console.error('Error during monitoring cycle:', err);
  } finally {
    cronState.isChecking = false;
    scheduleNextCronRun();
  }

  return { newItemsCount, totalItems: detectedItems.length, apuracao: latestApuracao };
}

function scheduleNextCronRun() {
  if (cronTimer) {
    clearTimeout(cronTimer);
    cronTimer = null;
  }

  if (!cronState.enabled) {
    cronState.nextRunAt = null;
    return;
  }

  const ms = cronState.intervalMinutes * 60 * 1000;
  cronState.nextRunAt = new Date(Date.now() + ms).toISOString();

  cronTimer = setTimeout(() => {
    runMonitoringCycle();
  }, ms);
}

// Initial bootstrap
setTimeout(() => {
  runMonitoringCycle();
}, 1500);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Endpoints
  app.get('/api/apuracao-rs', async (req: Request, res: Response) => {
    try {
      if (!latestApuracao) {
        await scrapeG1ApuracaoRS();
      }
      res.json({
        status: 'ok',
        apuracao: latestApuracao,
        cron: cronState,
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Falha ao buscar apuração' });
    }
  });

  app.post('/api/scrape-now', async (req: Request, res: Response) => {
    try {
      const data = await scrapeG1ApuracaoRS();
      res.json({
        status: 'ok',
        apuracao: data,
        cron: cronState,
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Erro ao raspar G1' });
    }
  });

  app.get('/api/feed', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      cron: cronState,
      items: detectedItems,
      apuracao: latestApuracao,
      totalCount: detectedItems.length,
      serverTime: new Date().toISOString(),
    });
  });

  app.post('/api/check-now', async (req: Request, res: Response) => {
    const result = await runMonitoringCycle();
    res.json({
      status: 'ok',
      ...result,
      cron: cronState,
      items: detectedItems,
      apuracao: latestApuracao,
    });
  });

  app.post('/api/cron-config', (req: Request, res: Response) => {
    const { enabled, intervalMinutes, queries } = req.body;

    if (typeof enabled === 'boolean') {
      cronState.enabled = enabled;
    }

    if (typeof intervalMinutes === 'number' && intervalMinutes >= 1 && intervalMinutes <= 120) {
      cronState.intervalMinutes = intervalMinutes;
    }

    if (Array.isArray(queries) && queries.length > 0) {
      cronState.queries = queries.filter((q) => typeof q === 'string' && q.trim().length > 0);
    }

    scheduleNextCronRun();

    res.json({
      status: 'ok',
      cron: cronState,
    });
  });

  app.get('/api/export', (req: Request, res: Response) => {
    const format = req.query.format === 'csv' ? 'csv' : 'txt';

    if (format === 'csv') {
      const header = 'Tipo;Data;Identificacao;Votos/Fonte;Status/Link\n';
      const rows: string[] = [];

      // Add Election Summary
      if (latestApuracao) {
        rows.push(`"APURACAO_RS";"${latestApuracao.scrapedAt}";"Urnas Apuradas";"${latestApuracao.urnas.andamento}%";"G1 RS 2026"`);
        if (latestApuracao.carlosBurigo) {
          const cb = latestApuracao.carlosBurigo;
          rows.push(`"CANDIDATO";"${latestApuracao.scrapedAt}";"${cb.nome} (${cb.numero} - ${cb.partido})";"${cb.votos.quantidade} votos (${cb.votos.porcentagem}%)";"${cb.statusDescricao}"`);
        }
      }

      // Add News
      detectedItems.forEach((item) => {
        const safeTitle = `"${item.title.replace(/"/g, '""')}"`;
        const safeSource = `"${item.source.replace(/"/g, '""')}"`;
        const safeDate = `"${new Date(item.timestamp).toLocaleString('pt-BR')}"`;
        rows.push(`"NOTICIA";${safeDate};${safeSource};${safeTitle};${item.link}`);
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="monitor-apuracao-carlos-burigo.csv"');
      res.send('\uFEFF' + header + rows.join('\n'));
      return;
    }

    // Default TXT
    let body = `RELATÓRIO DE MONITORAMENTO & APURAÇÃO ELEIÇÕES RS 2026\n`;
    body += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    body += `Fonte oficial: ${G1_RS_PAGE_URL}\n`;
    body += `${'='.repeat(65)}\n\n`;

    if (latestApuracao) {
      body += `[SITUAÇÃO DA APURAÇÃO NO RIO GRANDE DO SUL]\n`;
      body += `Urnas apuradas: ${latestApuracao.urnas.andamento}%\n`;
      body += `Eleitores aptos: ${latestApuracao.urnas.eleitores.toLocaleString('pt-BR')}\n`;
      body += `Status: ${latestApuracao.pageMeta.ssrState} (${latestApuracao.pageMeta.phase})\n\n`;

      if (latestApuracao.carlosBurigo) {
        const cb = latestApuracao.carlosBurigo;
        body += `[DESEMPENHO: CARLOS BÚRIGO]\n`;
        body += `Cargo: ${cb.cargo} | Número: ${cb.numero} | Partido: ${cb.partido}\n`;
        body += `Posição geral: ${cb.posicao}º colocado\n`;
        body += `Total de votos: ${cb.votos.quantidade.toLocaleString('pt-BR')} (${cb.votos.porcentagem}%)\n`;
        body += `Situação: ${cb.statusDescricao}\n\n`;
      }

      body += `[GOVERNADOR RS - PRINCIPAIS CANDIDATOS]\n`;
      latestApuracao.governador.slice(0, 5).forEach((c, idx) => {
        body += `${idx + 1}. ${c.nome} (${c.partido} - ${c.numero}): ${c.votos.quantidade.toLocaleString('pt-BR')} votos (${c.votos.porcentagem}%)\n`;
      });
      body += `\n${'='.repeat(65)}\n\n`;
    }

    body += `[CLIPPING DE NOTÍCIAS & MENÇÕES (${detectedItems.length} matérias)]\n\n`;
    body += detectedItems
      .map(
        (it, idx) =>
          `[${idx + 1}] ${it.title}\nFonte: ${it.source} | Data: ${new Date(it.timestamp).toLocaleString('pt-BR')}\nLink: ${it.link}\n`
      )
      .join('\n------------------------------------------------------------\n\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-apuracao-carlos-burigo.txt"');
    res.send(body);
  });

  // Vite development mode vs production static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Monitor Carlos Burigo & Apuração RS running on port ${PORT}`);
  });
}

startServer();
