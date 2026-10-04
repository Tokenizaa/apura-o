export interface SecaoDetalhada {
  numero: number;
  local: string;
  bairroOuDistrito: string;
  totalEleitores: number;
  status: 'Apurada' | 'Apurando' | 'Aguardando';
  votosApurados: number;
  votosCarlosBurigo: number;
  percentualCarlosBurigo: string;
}

export interface MunicipioLevantamento {
  id: string;
  nome: string;
  regiao: string;
  codigoTse: string;
  codigoIbge: string;
  zonaEleitoral: string;
  eleitoresAptos: number;
  secoesTotal: number;
  secoesApuradas: number;
  andamento: string;
  percentual: number;
  carlosBurigo: {
    votos: number;
    porcentagem: string;
    posicaoNoMunicipio: number;
    status: string;
  };
  secoes: SecaoDetalhada[];
}

export function buildMunicipiosLevantamento(andamentoGeralPercent: number): MunicipioLevantamento[] {
  const pGeral = Math.max(0, Math.min(100, andamentoGeralPercent));

  // 1. SÃO JOSÉ DOS AUSENTES (Campos de Cima da Serra - 63ª Zona)
  const ausentesSecoesList = [
    { numero: 44, local: 'E.E.E.M. Aparados da Serra (Sede)', bairroOuDistrito: 'Centro', totalEleitores: 345 },
    { numero: 45, local: 'E.E.E.M. Aparados da Serra (Sede)', bairroOuDistrito: 'Centro', totalEleitores: 332 },
    { numero: 46, local: 'E.E.E.M. Aparados da Serra (Sede)', bairroOuDistrito: 'Centro', totalEleitores: 310 },
    { numero: 47, local: 'E.M.E.F. Silveira', bairroOuDistrito: 'Distrito de Silveira', totalEleitores: 295 },
    { numero: 48, local: 'E.M.E.F. Varginha', bairroOuDistrito: 'Distrito de Varginha', totalEleitores: 280 },
    { numero: 49, local: 'Salão Comunitário Faxinal Preto', bairroOuDistrito: 'Faxinal Preto', totalEleitores: 260 },
    { numero: 50, local: 'Salão Comunitário Potreirinhos', bairroOuDistrito: 'Potreirinhos', totalEleitores: 250 },
    { numero: 51, local: 'Escola Rural Chapada', bairroOuDistrito: 'Chapada dos Ausentes', totalEleitores: 245 },
    { numero: 52, local: 'Salão Paroquial São José', bairroOuDistrito: 'Centro', totalEleitores: 320 },
    { numero: 53, local: 'Pavilhão Comunitário São Mateus', bairroOuDistrito: 'Linha São Mateus', totalEleitores: 196 },
    { numero: 54, local: 'Pavilhão Comunitário Boi Preto', bairroOuDistrito: 'Boi Preto', totalEleitores: 190 },
  ];

  const ausentesApuradas = pGeral >= 99 ? 11 : Math.round((pGeral / 100) * 11);
  let ausentesBurigoTotal = 0;
  const ausentesSecoes: SecaoDetalhada[] = ausentesSecoesList.map((sec, idx) => {
    const isApurada = idx < ausentesApuradas;
    const isApurando = idx === ausentesApuradas && pGeral > 0 && ausentesApuradas < 11;
    const status = isApurada ? 'Apurada' : isApurando ? 'Apurando' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.82) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.24) : 0;
    ausentesBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 2. CAXIAS DO SUL (Serra Gaúcha - 16ª e 169ª Zonas Eleitorais)
  const caxiasSecoesList = [
    { numero: 1, local: 'Colégio Murialdo (Centro)', bairroOuDistrito: 'Centro', totalEleitores: 380 },
    { numero: 12, local: 'Colégio La Salle Caxias', bairroOuDistrito: 'São Pelegrino', totalEleitores: 375 },
    { numero: 25, local: 'E.E.E.M. Emílio Meyer', bairroOuDistrito: 'Cruzeiro', totalEleitores: 390 },
    { numero: 42, local: 'E.E.E.F. Abramo Eberle', bairroOuDistrito: 'Rio Branco', totalEleitores: 360 },
    { numero: 68, local: 'E.M.E.F. Presidente Tancredo Neves', bairroOuDistrito: 'Belo Horizonte', totalEleitores: 370 },
    { numero: 85, local: 'Escola Estadual Cristóvão de Mendoza', bairroOuDistrito: 'Fátima', totalEleitores: 410 },
    { numero: 110, local: 'E.M.E.F. Professora Leonor Rosa', bairroOuDistrito: 'Desvio Rizzo', totalEleitores: 395 },
    { numero: 145, local: 'Colégio Estadual Imigrante', bairroOuDistrito: 'Santa Fé', totalEleitores: 385 },
    { numero: 180, local: 'E.E.E.F. Santa Catarina', bairroOuDistrito: 'Pio X', totalEleitores: 365 },
    { numero: 215, local: 'Salão Paroquial de Ana Rech', bairroOuDistrito: 'Ana Rech', totalEleitores: 350 },
    { numero: 240, local: 'E.M.E.F. Padre Antônio Vieira', bairroOuDistrito: 'Forqueta', totalEleitores: 340 },
    { numero: 275, local: 'E.M.E.F. Sanvitto', bairroOuDistrito: 'Sanvitto', totalEleitores: 360 },
  ];

  const caxiasTotalSecoes = 1048;
  const caxiasApuradas = Math.round((pGeral / 100) * caxiasTotalSecoes);
  const caxiasSampleApuradas = Math.round((pGeral / 100) * caxiasSecoesList.length);
  let caxiasBurigoTotal = 0;
  const caxiasSecoes: SecaoDetalhada[] = caxiasSecoesList.map((sec, idx) => {
    const isApurada = idx < caxiasSampleApuradas;
    const isApurando = idx === caxiasSampleApuradas && pGeral > 0 && caxiasSampleApuradas < caxiasSecoesList.length;
    const status = isApurada ? 'Apurada' : isApurando ? 'Apurando' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.81) : 0;
    // Carlos Búrigo has high recognition in Caxias do Sul (historical political base)
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.185) : 0;
    caxiasBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 3. BOM JESUS (Campos de Cima da Serra - 63ª Zona Sede)
  const bomJesusSecoesList = [
    { numero: 1, local: 'E.E.E.M. Frei Casimiro Zaffonato', bairroOuDistrito: 'Centro', totalEleitores: 350 },
    { numero: 2, local: 'E.E.E.M. Frei Casimiro Zaffonato', bairroOuDistrito: 'Centro', totalEleitores: 340 },
    { numero: 8, local: 'E.M.E.F. Professora Maria Araci', bairroOuDistrito: 'Santa Catarina', totalEleitores: 310 },
    { numero: 15, local: 'Salão Comunitário de Governador Portela', bairroOuDistrito: 'Distrito Portela', totalEleitores: 280 },
    { numero: 22, local: 'Escola Municipal de Casa Branca', bairroOuDistrito: 'Casa Branca', totalEleitores: 240 },
  ];
  const bjTotalSecoes = 32;
  const bjApuradas = Math.round((pGeral / 100) * bjTotalSecoes);
  const bjSampleApuradas = Math.round((pGeral / 100) * bomJesusSecoesList.length);
  let bjBurigoTotal = 0;
  const bjSecoes: SecaoDetalhada[] = bomJesusSecoesList.map((sec, idx) => {
    const isApurada = idx < bjSampleApuradas;
    const status = isApurada ? 'Apurada' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.79) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.21) : 0;
    bjBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 4. VACARIA (Campos de Cima da Serra - 49ª Zona)
  const vacariaSecoesList = [
    { numero: 10, local: 'I.E.E. Cristóvão de Mendoza', bairroOuDistrito: 'Centro', totalEleitores: 360 },
    { numero: 25, local: 'E.E.E.F. Padre Efrem', bairroOuDistrito: 'Glória', totalEleitores: 345 },
    { numero: 40, local: 'E.M.E.F. Dom Henrique Gelain', bairroOuDistrito: 'Borges', totalEleitores: 330 },
    { numero: 55, local: 'E.M.E.F. Romeu Biazus', bairroOuDistrito: 'Monte Claro', totalEleitores: 320 },
  ];
  const vacariaTotalSecoes = 172;
  const vacariaApuradas = Math.round((pGeral / 100) * vacariaTotalSecoes);
  const vacariaSampleApuradas = Math.round((pGeral / 100) * vacariaSecoesList.length);
  let vacariaBurigoTotal = 0;
  const vacariaSecoes: SecaoDetalhada[] = vacariaSecoesList.map((sec, idx) => {
    const isApurada = idx < vacariaSampleApuradas;
    const status = isApurada ? 'Apurada' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.80) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.14) : 0;
    vacariaBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 5. JAQUIRANA (Campos de Cima da Serra - 63ª Zona)
  const jaquiranaSecoesList = [
    { numero: 30, local: 'E.E.E.M. Desidério Finamor', bairroOuDistrito: 'Centro', totalEleitores: 330 },
    { numero: 31, local: 'E.E.E.M. Desidério Finamor', bairroOuDistrito: 'Centro', totalEleitores: 320 },
    { numero: 35, local: 'Salão Comunitário Chapada Grande', bairroOuDistrito: 'Interior', totalEleitores: 240 },
  ];
  const jaqTotalSecoes = 14;
  const jaqApuradas = Math.round((pGeral / 100) * jaqTotalSecoes);
  const jaqSampleApuradas = Math.round((pGeral / 100) * jaquiranaSecoesList.length);
  let jaqBurigoTotal = 0;
  const jaqSecoes: SecaoDetalhada[] = jaquiranaSecoesList.map((sec, idx) => {
    const isApurada = idx < jaqSampleApuradas;
    const status = isApurada ? 'Apurada' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.81) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.22) : 0;
    jaqBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 6. FARROUPILHA (Serra Gaúcha - 61ª Zona)
  const farroupilhaSecoesList = [
    { numero: 5, local: 'Colégio Estadual São Tiago', bairroOuDistrito: 'Centro', totalEleitores: 370 },
    { numero: 18, local: 'E.E.E.F. Vivian Maggioni', bairroOuDistrito: 'Pio X', totalEleitores: 355 },
    { numero: 32, local: 'E.M.E.F. Santa Cruz', bairroOuDistrito: 'Nova Vicenza', totalEleitores: 340 },
  ];
  const farroupilhaTotalSecoes = 160;
  const farroupilhaApuradas = Math.round((pGeral / 100) * farroupilhaTotalSecoes);
  const farroupilhaSampleApuradas = Math.round((pGeral / 100) * farroupilhaSecoesList.length);
  let farroupilhaBurigoTotal = 0;
  const farroupilhaSecoes: SecaoDetalhada[] = farroupilhaSecoesList.map((sec, idx) => {
    const isApurada = idx < farroupilhaSampleApuradas;
    const status = isApurada ? 'Apurada' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.80) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.12) : 0;
    farroupilhaBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  // 7. PORTO ALEGRE (Região Metropolitana / Capital)
  const poaSecoesList = [
    { numero: 10, local: 'Colégio Estadual Júlio de Castilhos', bairroOuDistrito: 'Santana', totalEleitores: 420 },
    { numero: 35, local: 'Colégio Militar de Porto Alegre', bairroOuDistrito: 'Menino Deus', totalEleitores: 410 },
    { numero: 72, local: 'Colégio Anchieta', bairroOuDistrito: 'Três Figueiras', totalEleitores: 390 },
    { numero: 110, local: 'E.E.E.M. Infante Dom Henrique', bairroOuDistrito: 'Restinga', totalEleitores: 380 },
  ];
  const poaTotalSecoes = 3450;
  const poaApuradas = Math.round((pGeral / 100) * poaTotalSecoes);
  const poaSampleApuradas = Math.round((pGeral / 100) * poaSecoesList.length);
  let poaBurigoTotal = 0;
  const poaSecoes: SecaoDetalhada[] = poaSecoesList.map((sec, idx) => {
    const isApurada = idx < poaSampleApuradas;
    const status = isApurada ? 'Apurada' : 'Aguardando';
    const votosApurados = isApurada ? Math.round(sec.totalEleitores * 0.77) : 0;
    const votosBurigo = isApurada ? Math.round(votosApurados * 0.045) : 0;
    poaBurigoTotal += votosBurigo;
    const pct = votosApurados > 0 ? ((votosBurigo / votosApurados) * 100).toFixed(2).replace('.', ',') : '0,00';
    return {
      ...sec,
      status,
      votosApurados,
      votosCarlosBurigo: votosBurigo,
      percentualCarlosBurigo: pct,
    };
  });

  return [
    {
      id: 'sao-jose-dos-ausentes',
      nome: 'São José dos Ausentes',
      regiao: 'Campos de Cima da Serra',
      codigoTse: '87726',
      codigoIbge: '4318622',
      zonaEleitoral: '63ª Zona',
      eleitoresAptos: 3023,
      secoesTotal: 11,
      secoesApuradas: ausentesApuradas,
      andamento: ((ausentesApuradas / 11) * 100).toFixed(2).replace('.', ','),
      percentual: (ausentesApuradas / 11) * 100,
      carlosBurigo: {
        votos: ausentesBurigoTotal || Math.round(ausentesApuradas * 58),
        porcentagem: pGeral > 0 ? '24,15' : '0,00',
        posicaoNoMunicipio: 1,
        status: ausentesApuradas === 11 ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: ausentesSecoes,
    },
    {
      id: 'caxias-do-sul',
      nome: 'Caxias do Sul',
      regiao: 'Serra Gaúcha',
      codigoTse: '85995',
      codigoIbge: '4305108',
      zonaEleitoral: '16ª e 169ª Zonas',
      eleitoresAptos: 347890,
      secoesTotal: caxiasTotalSecoes,
      secoesApuradas: caxiasApuradas,
      andamento: ((caxiasApuradas / caxiasTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (caxiasApuradas / caxiasTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(caxiasApuradas * 48),
        porcentagem: pGeral > 0 ? '18,50' : '0,00',
        posicaoNoMunicipio: 1,
        status: caxiasApuradas === caxiasTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: caxiasSecoes,
    },
    {
      id: 'bom-jesus',
      nome: 'Bom Jesus',
      regiao: 'Campos de Cima da Serra',
      codigoTse: '85472',
      codigoIbge: '4302303',
      zonaEleitoral: '63ª Zona (Sede)',
      eleitoresAptos: 9480,
      secoesTotal: bjTotalSecoes,
      secoesApuradas: bjApuradas,
      andamento: ((bjApuradas / bjTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (bjApuradas / bjTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(bjApuradas * 45),
        porcentagem: pGeral > 0 ? '21,10' : '0,00',
        posicaoNoMunicipio: 1,
        status: bjApuradas === bjTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: bjSecoes,
    },
    {
      id: 'vacaria',
      nome: 'Vacaria',
      regiao: 'Campos de Cima da Serra',
      codigoTse: '89338',
      codigoIbge: '4322509',
      zonaEleitoral: '49ª Zona',
      eleitoresAptos: 52140,
      secoesTotal: vacariaTotalSecoes,
      secoesApuradas: vacariaApuradas,
      andamento: ((vacariaApuradas / vacariaTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (vacariaApuradas / vacariaTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(vacariaApuradas * 32),
        porcentagem: pGeral > 0 ? '14,20' : '0,00',
        posicaoNoMunicipio: 2,
        status: vacariaApuradas === vacariaTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: vacariaSecoes,
    },
    {
      id: 'jaquirana',
      nome: 'Jaquirana',
      regiao: 'Campos de Cima da Serra',
      codigoTse: '87017',
      codigoIbge: '4311130',
      zonaEleitoral: '63ª Zona',
      eleitoresAptos: 3650,
      secoesTotal: jaqTotalSecoes,
      secoesApuradas: jaqApuradas,
      andamento: ((jaqApuradas / jaqTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (jaqApuradas / jaqTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(jaqApuradas * 50),
        porcentagem: pGeral > 0 ? '22,40' : '0,00',
        posicaoNoMunicipio: 1,
        status: jaqApuradas === jaqTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: jaqSecoes,
    },
    {
      id: 'farroupilha',
      nome: 'Farroupilha',
      regiao: 'Serra Gaúcha',
      codigoTse: '86495',
      codigoIbge: '4307906',
      zonaEleitoral: '61ª Zona',
      eleitoresAptos: 58900,
      secoesTotal: farroupilhaTotalSecoes,
      secoesApuradas: farroupilhaApuradas,
      andamento: ((farroupilhaApuradas / farroupilhaTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (farroupilhaApuradas / farroupilhaTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(farroupilhaApuradas * 28),
        porcentagem: pGeral > 0 ? '12,30' : '0,00',
        posicaoNoMunicipio: 3,
        status: farroupilhaApuradas === farroupilhaTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: farroupilhaSecoes,
    },
    {
      id: 'porto-alegre',
      nome: 'Porto Alegre',
      regiao: 'Metropolitana / Capital',
      codigoTse: '88013',
      codigoIbge: '4314902',
      zonaEleitoral: 'Múltiplas (1ª, 2ª, 111ª...)',
      eleitoresAptos: 1098420,
      secoesTotal: poaTotalSecoes,
      secoesApuradas: poaApuradas,
      andamento: ((poaApuradas / poaTotalSecoes) * 100).toFixed(2).replace('.', ','),
      percentual: (poaApuradas / poaTotalSecoes) * 100,
      carlosBurigo: {
        votos: Math.round(poaApuradas * 16),
        porcentagem: pGeral > 0 ? '4,50' : '0,00',
        posicaoNoMunicipio: 8,
        status: poaApuradas === poaTotalSecoes ? 'Totalização Final' : 'Apuração em andamento',
      },
      secoes: poaSecoes,
    },
  ];
}
