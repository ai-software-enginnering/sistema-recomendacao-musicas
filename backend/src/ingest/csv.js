import fs from 'node:fs/promises';

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (c === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += c;
  }

  out.push(cur);
  return out;
}

export async function readCsv(filePath) {
  // ✅ Tratamento de erro no arquivo
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Arquivo CSV não encontrado: ${filePath}`);
    }
    if (err.code === 'EACCES') {
      throw new Error(`Permissão negada ao ler: ${filePath}`);
    }
    throw new Error(`Erro ao ler CSV: ${err.message}`);
  }

  // ✅ Filtrar linhas vazias corretamente
  const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV vazio ou sem dados (mínimo: header + 1 linha de dados)');
  }

  // ✅ Validar headers obrigatórios
  const requiredHeaders = [
    'Track URI', 'Track Name', 'Artist Name(s)', 'Album Name',
    'Danceability', 'Energy', 'Loudness', 'Speechiness',
    'Acousticness', 'Instrumentalness', 'Liveness', 'Valence',
    'Tempo', 'Popularity'
  ];

  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

  if (missingHeaders.length > 0) {
    throw new Error(`Colunas obrigatórias faltando: ${missingHeaders.join(', ')}`);
  }

  // ✅ Processar linhas com validação
  return lines.slice(1).map((line, lineIdx) => {
    const cols = splitCsvLine(line);
    
    if (cols.length !== headers.length) {
      console.warn(
        `[csv] Linha ${lineIdx + 2}: esperava ${headers.length} colunas, ` +
        `encontrou ${cols.length}. Preenchendo com valores vazios.`
      );
    }
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    return row;
  });
}