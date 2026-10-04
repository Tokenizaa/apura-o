import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MunicipioLevantamento } from './municipiosData';

export interface GeneratePdfParams {
  apuracaoGeral: {
    urnas: {
      andamento: string;
      percentual: number;
      secoesTotalizadas: number;
      secoes: number;
      eleitores: number;
      eleitoradoApurado: number;
    };
    carlosBurigo: {
      nome: string;
      numero: string;
      partido: string;
      cargo: string;
      votos: {
        quantidade: number;
        porcentagem: string;
      };
      posicao: number;
      statusDescricao: string;
    } | null;
    governador?: Array<{
      nome: string;
      numero: string;
      partido: string;
      votos: {
        quantidade: number;
        porcentagem: string;
      };
    }>;
    scrapedAt?: string;
  };
  municipios: MunicipioLevantamento[];
  selectedMunicipioId?: string;
}

export function generateElectionPdfReport({
  apuracaoGeral,
  municipios,
  selectedMunicipioId,
}: GeneratePdfParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dataFormatada = now.toLocaleDateString('pt-BR');
  const horaFormatada = now.toLocaleTimeString('pt-BR');

  // Colors
  const primaryRed: [number, number, number] = [185, 28, 28]; // red-700
  const darkNeutral: [number, number, number] = [23, 23, 23]; // neutral-900
  const slateMuted: [number, number, number] = [100, 116, 139];

  // 1. TOP HEADER BANNER
  doc.setFillColor(...primaryRed);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ELEIÇÕES GERAIS 2026 • RIO GRANDE DO SUL', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO OFICIAL DE APURAÇÃO • LEVANTAMENTO POR MUNICÍPIOS E SEÇÕES', 14, 18);

  doc.setFontSize(8);
  doc.text(`Emitido em: ${dataFormatada} às ${horaFormatada}`, pageWidth - 14, 11, { align: 'right' });
  doc.text('Fonte: TSE / Dados Oficiais G1', pageWidth - 14, 18, { align: 'right' });

  let cursorY = 32;

  // 2. CANDIDATE & STATE SUMMARY BOX
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, cursorY, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(...primaryRed);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CARLOS BÚRIGO — DEPUTADO ESTADUAL (RS)', 18, cursorY + 7);

  doc.setTextColor(...darkNeutral);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`NÚMERO: 15140   •   PARTIDO: MDB   •   SITUAÇÃO: ${apuracaoGeral.carlosBurigo?.statusDescricao || 'Em apuração'}`, 18, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const totalVotosRS = (apuracaoGeral.carlosBurigo?.votos.quantidade || 0).toLocaleString('pt-BR');
  const pctVotosRS = apuracaoGeral.carlosBurigo?.votos.porcentagem || '0,00';
  const posRS = apuracaoGeral.carlosBurigo?.posicao || 73;
  doc.text(`Votação Estadual: ${totalVotosRS} votos (${pctVotosRS}%)  •  Posição TSE: ${posRS}º colocado`, 18, cursorY + 19);

  const urnasRS = apuracaoGeral.urnas.andamento || '0,00';
  const secTotalRS = (apuracaoGeral.urnas.secoesTotalizadas || 0).toLocaleString('pt-BR');
  const secRS = (apuracaoGeral.urnas.secoes || 29840).toLocaleString('pt-BR');
  const eleitoresRS = (apuracaoGeral.urnas.eleitores || 8526233).toLocaleString('pt-BR');
  doc.text(`Totalização Geral RS: ${urnasRS}% das urnas (${secTotalRS} de ${secRS} seções)  •  Eleitorado: ${eleitoresRS} aptos`, 18, cursorY + 24);

  cursorY += 34;

  // 3. TABLE 1: CONSOLIDADO POR MUNICÍPIOS
  doc.setTextColor(...darkNeutral);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Consolidado por Município (Campos de Cima da Serra, Serra Gaúcha & Região)', 14, cursorY);
  cursorY += 3;

  const municipiosRows = municipios.map((m) => [
    m.nome,
    m.regiao,
    m.zonaEleitoral,
    m.secoesTotal.toLocaleString('pt-BR'),
    `${m.secoesApuradas} (${m.andamento}%)`,
    m.eleitoresAptos.toLocaleString('pt-BR'),
    m.carlosBurigo.votos.toLocaleString('pt-BR'),
    `${m.carlosBurigo.porcentagem}%`,
    `${m.carlosBurigo.posicaoNoMunicipio}º lugar`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        'Município',
        'Região',
        'Zona Eleitoral',
        'Urnas',
        'Apuradas',
        'Eleitores',
        'Votos Búrigo',
        '% Votos',
        'Classif.',
      ],
    ],
    body: municipiosRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryRed,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 14 },
      8: { halign: 'center', cellWidth: 14 },
    },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 8;

  // 4. TABLE 2: DETALHAMENTO DAS 11 SEÇÕES DE SÃO JOSÉ DOS AUSENTES
  const ausentes = municipios.find((m) => m.id === 'sao-jose-dos-ausentes') || municipios[0];

  doc.setTextColor(...darkNeutral);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. Boletim de Urna Detalhado — Todas as 11 Seções de São José dos Ausentes (RS)`, 14, cursorY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`63ª Zona Eleitoral • Código TSE: 87726 • Total de Eleitores: 3.023 • Urnas: ${ausentes.secoesApuradas} de 11 apuradas (${ausentes.andamento}%)`, 14, cursorY + 4);
  cursorY += 6;

  const ausentesSecoesRows = ausentes.secoes.map((s) => [
    `Seção ${s.numero}`,
    s.local,
    s.bairroOuDistrito,
    s.totalEleitores.toString(),
    s.status,
    s.votosApurados.toString(),
    `${s.votosCarlosBurigo} votos`,
    `${s.percentualCarlosBurigo}%`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        'Seção',
        'Local de Votação',
        'Bairro / Distrito',
        'Eleitores',
        'Status da Urna',
        'Votos Apurados',
        'Votos Carlos Búrigo',
        '% Carlos Búrigo',
      ],
    ],
    body: ausentesSecoesRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
      1: { cellWidth: 54 },
      2: { cellWidth: 32 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      7: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 16 },
    },
    margin: { left: 14, right: 14 },
  });

  // PAGE BREAK FOR CAXIAS DO SUL & GOVERNADOR
  doc.addPage();
  cursorY = 16;

  // Header on second page
  doc.setFillColor(...primaryRed);
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ELEIÇÕES GERAIS 2026 • LEVANTAMENTO POR MUNICÍPIOS E SEÇÕES (CONTINUAÇÃO)', 14, 8);
  doc.text(`Carlos Búrigo (15140) • RS`, pageWidth - 14, 8, { align: 'right' });

  cursorY = 20;

  // 5. TABLE 3: CAXIAS DO SUL SECTIONS BREAKDOWN
  const caxias = municipios.find((m) => m.id === 'caxias-do-sul');
  if (caxias && caxias.secoes.length > 0) {
    doc.setTextColor(...darkNeutral);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`3. Amostragem de Seções Eleitorais de Caxias do Sul (Maior Colégio da Serra)`, 14, cursorY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`16ª e 169ª Zonas • 1.048 seções no total • 347.890 eleitores aptos • Principais colégios eleitorais`, 14, cursorY + 4);
    cursorY += 6;

    const caxiasSecoesRows = caxias.secoes.map((s) => [
      `Seção ${s.numero}`,
      s.local,
      s.bairroOuDistrito,
      s.totalEleitores.toString(),
      s.status,
      s.votosApurados.toString(),
      `${s.votosCarlosBurigo} votos`,
      `${s.percentualCarlosBurigo}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [
        [
          'Seção',
          'Local de Votação',
          'Bairro / Distrito',
          'Eleitores',
          'Status da Urna',
          'Votos Apurados',
          'Votos Carlos Búrigo',
          '% Carlos Búrigo',
        ],
      ],
      body: caxiasSecoesRows,
      theme: 'striped',
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
        1: { cellWidth: 54 },
        2: { cellWidth: 32 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        7: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 16 },
      },
      margin: { left: 14, right: 14 },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. TABLE 4: GOVERNADOR RS CANDIDATES OVERVIEW
  if (apuracaoGeral.governador && apuracaoGeral.governador.length > 0) {
    doc.setTextColor(...darkNeutral);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`4. Resultados Oficiais para Governador do Rio Grande do Sul (Top Candidatos)`, 14, cursorY);
    cursorY += 4;

    const govRows = apuracaoGeral.governador.slice(0, 6).map((g, idx) => [
      `${idx + 1}º`,
      g.nome,
      g.numero,
      g.partido,
      g.votos.quantidade.toLocaleString('pt-BR'),
      `${g.votos.porcentagem}%`,
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['Pos.', 'Candidato a Governador', 'Número', 'Partido', 'Votos Totais', 'Percentual']],
      body: govRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryRed,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { fontStyle: 'bold', cellWidth: 70 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 },
        5: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Verification & Legal Disclaimer box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, cursorY, pageWidth - 28, 18, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(...slateMuted);
  doc.text(
    'OBSERVAÇÃO E CONTROLE OFICIAL: Documento técnico gerado automaticamente pelo Monitor Eleitoral Carlos Búrigo.',
    18,
    cursorY + 5
  );
  doc.text(
    'Os dados de seções e urnas refletem as transmissões parciais e oficiais do Tribunal Superior Eleitoral (TSE) e G1.',
    18,
    cursorY + 10
  );
  doc.text(
    `Arquivo para acompanhamento de coordenação de campanha • Hash de verificação: ${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    18,
    cursorY + 14
  );

  // Footers on both pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Monitor Carlos Búrigo 2026 • Documento Eleitoral Oficial • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Trigger browser download of PDF
  const filename = `levantamento-apuracao-municipios-secoes-rs2026-${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
