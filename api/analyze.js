import { GoogleGenerativeAI } from '@google/generative-ai';

// Matriz de serviços Connect Ideia: fase × gargalo (3 fases × 4 gargalos = 12 combinações)
const CONNECT_SERVICES = {
  'ideia': {
    'lp':        'LP de validação de mercado: capturar leads e testar demanda real antes de investir no produto completo',
    'app':       'MVP em PWA: lançar produto mínimo funcional para validar com usuários reais antes de escalar',
    'automacao': 'Automação de atendimento desde o início: operar sem time grande via WhatsApp e CRM inteligentes',
    'ecossistema':'Ecossistema do zero: LP de validação + MVP + Automação de atendimento — base digital sólida desde o dia 1'
  },
  'operacao': {
    'lp':        'LP de alta conversão: transformar o tráfego atual em leads qualificados com copy e design premium',
    'app':       'App customizado: digitalizar processos e atendimento para ganhar eficiência sem aumentar o time',
    'automacao': 'Automação operacional: eliminar gargalos de atendimento, vendas e CRM com fluxos inteligentes',
    'ecossistema':'Integração do ecossistema: conectar LP, App e automações em uma stack coesa que opera sozinha'
  },
  'escala': {
    'lp':        'LPs segmentadas de alta conversão: multiplicar a captação de leads para suportar o crescimento acelerado',
    'app':       'App como canal de receita: produto digital próprio para escalar sem depender de plataformas de terceiros',
    'automacao': 'Automação de escala: operar volume crescente de atendimento e vendas sem custo proporcional de time',
    'ecossistema':'Ecossistema escalável: LP + App + Automação funcionando como uma máquina integrada de crescimento'
  }
};

function getService(phase, bottleneck) {
  const p = (phase || '').toLowerCase();
  const b = (bottleneck || '').toLowerCase();

  let phaseKey = 'operacao';
  if (p.includes('ideia') || p.includes('idea') || p.includes('início') || p.includes('inicio')) phaseKey = 'ideia';
  else if (p.includes('escala') || p.includes('scale') || p.includes('crescimento')) phaseKey = 'escala';

  let bottleneckKey = 'ecossistema';
  if (b.includes('lp') || b.includes('landing') || b.includes('vend') || b.includes('convers')) bottleneckKey = 'lp';
  else if (b.includes('app') || b.includes('pwa') || b.includes('produto')) bottleneckKey = 'app';
  else if (b.includes('autom') || b.includes('process') || b.includes('atend')) bottleneckKey = 'automacao';

  return CONNECT_SERVICES[phaseKey][bottleneckKey];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { url, phase, bottleneck } = req.body;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  const geminiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!geminiKey) {
    console.error('[analyze.js] Erro: GEMINI_API_KEY não encontrada no ambiente.');
    return res.status(200).json({ success: true, skipped: 'MISSING_KEY' });
  }

  try {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    let siteContent = '';
    let usedPlanoB = false;

    // 1. Scraping com Jina AI Reader (Principal - lida bem com JS)
    try {
      console.log('[analyze.js] Tentando Jina AI:', finalUrl);
      const jinaResponse = await fetch(`https://r.jina.ai/${finalUrl}`, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
        signal: AbortSignal.timeout(10000) // 10s para o Jina
      });
      if (jinaResponse.ok) {
        const rawText = await jinaResponse.text();
        siteContent = rawText.substring(0, 6000).trim();
      }
    } catch (e) {
      console.warn('[analyze.js] Jina falhou ou timeout:', e.message);
    }

    // 2. Plano B: Fetch Direto + Cheerio (Caso Jina falhe ou retorne pouco conteúdo)
    if (siteContent.length < 150) {
      try {
        console.log('[analyze.js] Iniciando Plano B (Cheerio):', finalUrl);
        const directResponse = await fetch(finalUrl, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          signal: AbortSignal.timeout(8000) 
        });
        if (directResponse.ok) {
          const html = await directResponse.text();
          const cheerio = await import('cheerio');
          const $ = cheerio.load(html);
          // Limpa o HTML antes de extrair texto
          $('script, style, nav, footer, noscript, svg, i, .menu, .nav').remove();
          siteContent = $('body').text().replace(/\s+/g, ' ').substring(0, 4500).trim();
          usedPlanoB = true;
          console.log('[analyze.js] Plano B obteve:', siteContent.length, 'chars');
        }
      } catch (e) {
        console.error('[analyze.js] Plano B também falhou:', e.message);
      }
    }

    if (siteContent.length < 80) {
      console.error('[analyze.js] Falha total na leitura do site.');
      return res.status(200).json({ success: true, skipped: 'SCRAPE_FAIL' });
    }

    // 2. Determinando serviço ideal cruzando fase + gargalo
    const servicoIdeal = getService(phase, bottleneck);

    // 3. Prompt de análise cruzada: site + fase + gargalo + serviço recomendado
    const prompt = `Você é o motor de inteligência da Connect Ideia, uma empresa de tecnologia e produtos digitais de alto nível.
Seu papel é analisar o negócio de um potencial cliente e entregar um diagnóstico curto, cirúrgico e altamente persuasivo que mostre que entendemos profundamente o negócio dele — e que temos a solução exata para o momento em que ele está.

## O que o cliente nos disse no chat:
- Fase atual do negócio: ${phase || 'Não informada'}
- Principal gargalo declarado: ${bottleneck || 'Não informado'}

## Conteúdo real extraído do site do cliente (${finalUrl}):
${siteContent}

## Solução Connect Ideia calibrada para essa fase + gargalo:
${servicoIdeal}

## Sua tarefa:
Analise o site e as respostas do cliente em conjunto. A fase do negócio muda o ângulo da recomendação:
- Fase Ideia → foco em validação, primeiro produto, base digital
- Fase Operação → foco em conversão, eficiência, eliminar gargalos
- Fase Escala → foco em volume, crescimento, automação sem custo proporcional

Com base nisso, identifique:
1. O que esse negócio faz (segmento, produto, público)
2. O principal GAP digital que o site revela considerando a fase em que ele está
3. A ação exata que a Connect Ideia entrega para resolver esse GAP nessa fase — com resultado tangível

Gere o diagnóstico nesse formato JSON exato:
{
  "negocio": "frase identificando o negócio com precisão",
  "gap": "frase sobre o principal problema digital detectado no site, no contexto da fase atual",
  "acao": "frase conectando fase + gargalo com o que a Connect Ideia resolve — com resultado tangível"
}

Regras:
- CADA CAMPO deve ter NO MÁXIMO 2 linhas (até 25 palavras). Seja cirúrgico — diagnóstico de consultor sênior, não relatório
- A fase do negócio DEVE influenciar o tom e o ângulo da ação recomendada
- Use dados reais do site, não invente
- A ação deve mencionar resultado tangível (ex: 3x mais leads, 80% menos atendimento manual, validar em 30 dias)
- NUNCA use aspas dentro dos valores JSON
- Retorne APENAS o JSON, sem explicações`;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    console.log('[analyze.js] Chamando Gemini com análise cruzada...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log('[analyze.js] Resposta Gemini:', responseText);

    // Parsear o JSON da resposta
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (e) {
      // Se não parsear, extrai o JSON do texto
      const match = responseText.match(/\{[\s\S]*\}/);
      analysis = match ? JSON.parse(match[0]) : null;
    }

    if (!analysis || !analysis.negocio) {
      console.error('[analyze.js] Resposta da IA inválida ou vazia.');
      return res.status(200).json({ success: true, skipped: 'LLM_FAIL' });
    }

    return res.status(200).json({ 
      success: true, 
      analysis: {
        negocio: analysis.negocio,
        gap: analysis.gap,
        acao: analysis.acao
      }
    });

  } catch (err) {
    console.error('[analyze.js] Erro crítico no handler:', err.message);
    return res.status(200).json({ success: true, skipped: 'ERROR', message: err.message });
  }
}
