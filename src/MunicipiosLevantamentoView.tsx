import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  Filter,
  Vote,
  Sparkles,
  Printer
} from 'lucide-react';
import { MunicipioLevantamento } from './municipiosData';
import { generateElectionPdfReport } from './reportGenerator';

interface MunicipiosLevantamentoViewProps {
  municipios: MunicipioLevantamento[];
  apuracaoGeral: any;
  onBackToGeral?: () => void;
}

export const MunicipiosLevantamentoView: React.FC<MunicipiosLevantamentoViewProps> = ({
  municipios,
  apuracaoGeral,
  onBackToGeral,
}) => {
  const [selectedMunId, setSelectedMunId] = useState<string>('todos');
  const [secaoSearchTerm, setSecaoSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Apurada' | 'Apurando' | 'Aguardando'>('todos');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Active municipality object
  const activeMun = municipios.find((m) => m.id === selectedMunId);

  // Filter sections across all or active municipality
  const filteredSecoes = useMemo(() => {
    let list: Array<{
      municipioNome: string;
      municipioId: string;
      secao: MunicipioLevantamento['secoes'][0];
    }> = [];

    if (selectedMunId === 'todos') {
      municipios.forEach((m) => {
        m.secoes.forEach((s) => {
          list.push({ municipioNome: m.nome, municipioId: m.id, secao: s });
        });
      });
    } else if (activeMun) {
      activeMun.secoes.forEach((s) => {
        list.push({ municipioNome: activeMun.nome, municipioId: activeMun.id, secao: s });
      });
    }

    if (statusFilter !== 'todos') {
      list = list.filter((item) => item.secao.status === statusFilter);
    }

    if (secaoSearchTerm.trim()) {
      const term = secaoSearchTerm.toLowerCase();
      list = list.filter(
        (item) =>
          item.secao.numero.toString().includes(term) ||
          item.secao.local.toLowerCase().includes(term) ||
          item.secao.bairroOuDistrito.toLowerCase().includes(term) ||
          item.municipioNome.toLowerCase().includes(term)
      );
    }

    return list;
  }, [municipios, selectedMunId, activeMun, statusFilter, secaoSearchTerm]);

  // Handler for PDF download
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      generateElectionPdfReport({
        apuracaoGeral,
        municipios,
        selectedMunicipioId: selectedMunId,
      });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Totals across active selection
  const totalEleitores = useMemo(() => {
    if (activeMun) return activeMun.eleitoresAptos;
    return municipios.reduce((acc, m) => acc + m.eleitoresAptos, 0);
  }, [activeMun, municipios]);

  const totalVotosBurigo = useMemo(() => {
    if (activeMun) return activeMun.carlosBurigo.votos;
    return municipios.reduce((acc, m) => acc + m.carlosBurigo.votos, 0);
  }, [activeMun, municipios]);

  const totalSecoesCount = useMemo(() => {
    if (activeMun) return activeMun.secoesTotal;
    return municipios.reduce((acc, m) => acc + m.secoesTotal, 0);
  }, [activeMun, municipios]);

  const totalSecoesApuradasCount = useMemo(() => {
    if (activeMun) return activeMun.secoesApuradas;
    return municipios.reduce((acc, m) => acc + m.secoesApuradas, 0);
  }, [activeMun, municipios]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & PDF Trigger Card */}
      <div className="bg-white border-2 border-red-600 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                Levantamento Oficial
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                Eleições RS 2026 &bull; 1º Turno
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                Carlos Búrigo 15140 (MDB)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1.5">
              Levantamento por Municípios e Seções de Todos os Votos
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Detalhamento de cada urna eletrônica, colégio eleitoral, seções apuradas e votação nominal.
            </p>
          </div>

          {/* Action Buttons: PDF Download */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95 disabled:opacity-50"
              title="Baixar levantamento completo formatado em documento PDF"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Documento em PDF'}</span>
            </button>

            {onBackToGeral && (
              <button
                type="button"
                onClick={onBackToGeral}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-2.5 rounded-lg border border-neutral-300 transition-colors cursor-pointer"
              >
                <span>Visão Geral RS</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 uppercase block">
              Urnas no Recorte
            </span>
            <span className="text-xl font-extrabold text-neutral-900">
              {totalSecoesApuradasCount.toLocaleString('pt-BR')} / {totalSecoesCount.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-neutral-500 block">
              ({totalSecoesCount > 0 ? ((totalSecoesApuradasCount / totalSecoesCount) * 100).toFixed(1) : 0}% apuradas)
            </span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 uppercase block">
              Eleitorado Total
            </span>
            <span className="text-xl font-extrabold text-neutral-900">
              {totalEleitores.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-neutral-500 block">eleitores aptos</span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 uppercase block">
              Votos Carlos Búrigo
            </span>
            <span className="text-xl font-extrabold text-red-600">
              {totalVotosBurigo.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-neutral-500 block">votos nominais</span>
          </div>

          <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
            <span className="text-[11px] font-bold text-neutral-500 uppercase block">
              Municípios Mapeados
            </span>
            <span className="text-xl font-extrabold text-neutral-900">
              {municipios.length}
            </span>
            <span className="text-[11px] text-neutral-500 block">cidades e regiões</span>
          </div>
        </div>
      </div>

      {/* Municipality Tabs Selector */}
      <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-red-600" />
            Selecione o Município para Filtrar:
          </span>

          <span className="text-xs text-neutral-500">
            Clique no município para ver suas seções específicas
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <button
            type="button"
            onClick={() => setSelectedMunId('todos')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
              selectedMunId === 'todos'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
          >
            Todos os Municípios ({municipios.length})
          </button>

          {municipios.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMunId(m.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                selectedMunId === m.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              <span>{m.nome}</span>
              <span className={`text-[10px] px-1 rounded font-mono ${selectedMunId === m.id ? 'bg-red-800 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                {m.secoesTotal} urnas
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table & Search Controls */}
      <div className="bg-white border border-neutral-300 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Vote className="w-4 h-4 text-red-600" />
              <span>
                {selectedMunId === 'todos'
                  ? 'Levantamento Consolidado de Todas as Seções'
                  : `Seções Eleitorais de ${activeMun?.nome} (${activeMun?.regiao})`}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Exibindo <strong>{filteredSecoes.length}</strong> seções eleitorais cadastradas.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={secaoSearchTerm}
                onChange={(e) => setSecaoSearchTerm(e.target.value)}
                placeholder="Buscar seção, colégio, bairro..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-neutral-50 border border-neutral-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-red-500 text-neutral-700 font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="Apurada">Apenas Apuradas</option>
              <option value="Apurando">Apenas Apurando</option>
              <option value="Aguardando">Apenas Aguardando</option>
            </select>
          </div>
        </div>

        {/* The Big Data Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-100 text-neutral-800 font-bold uppercase text-[11px] border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3">Município</th>
                <th className="py-2.5 px-3 text-center">Seção</th>
                <th className="py-2.5 px-3">Local de Votação (Colégio / Escola)</th>
                <th className="py-2.5 px-3">Bairro / Distrito</th>
                <th className="py-2.5 px-3 text-center">Eleitores</th>
                <th className="py-2.5 px-3 text-center">Status da Urna</th>
                <th className="py-2.5 px-3 text-right">Votos Carlos Búrigo</th>
                <th className="py-2.5 px-3 text-right">% Búrigo na Seção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredSecoes.length > 0 ? (
                filteredSecoes.map((item, idx) => (
                  <tr key={`${item.municipioId}-${item.secao.numero}-${idx}`} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      {item.municipioNome}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 text-center">
                      {item.secao.numero}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-neutral-800">
                      {item.secao.local}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      {item.secao.bairroOuDistrito}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-neutral-600">
                      {item.secao.totalEleitores}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.secao.status === 'Apurada' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Apurada</span>
                        </span>
                      ) : item.secao.status === 'Apurando' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Apurando</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                          <span>Aguardando</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-900 font-mono">
                      {item.secao.votosCarlosBurigo} votos
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600 font-mono">
                      {item.secao.percentualCarlosBurigo}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500 text-xs">
                    Nenhuma seção eleitoral encontrada para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with PDF Download prompt */}
        <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600">
          <span>
            Documento pronto para exportação com cabeçalho oficial do TSE, estatísticas e listagem por município.
          </span>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Baixar em formato PDF (.pdf) &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
