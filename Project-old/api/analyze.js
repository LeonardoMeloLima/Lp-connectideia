import { GoogleGenerativeAI } from '@google/generative-ai';

// Mapa de serviços Connect Ideia por fase + gargalo
const CONNECT_SERVICES = {
  'lp': 'Landing Pages de Alta Conversão com copy persuasiva, design premium e integração com automações de captura',
  'app': 'Apps e PWAs customizados com UX de produto digital, desde o Discovery até o Go-Live',
  'automacao': 'Automações de atendimento, vendas e operação via WhatsApp, CRM e fluxos inteligentes',
  'ecossistema': 'Ecossistema Digital completo: LP + App + Automação + Growth — tudo integrado e escalável'
};

function getService(bottleneck) {
  if (!bottleneck) return CONNECT_SERVICES['ecossistema'];
  const b = bottleneck.toLowerCase();
  if (b.includes('lp') || b.includes('landing') || b.includes('vend')) return CONNECT_SERVICES['lp'];
  if (b.includes('app') || b.includes('pwa')) return CONNECT_SERVICES['app'];
  if (b.includes('autom') || b.includes('process')) return CONNECT_SERVICES['automacao'];
  return CONNECT_SERVICES['ecossistema'];
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
  if (!geminiKey) return res.status(200).json({ success: true, skipped: true });

  try {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    console.log('[analyze.js] Scraping via Jina:', finalUrl);

    // 1. Scraping com Jina AI Reader (bypassa Cloudflare, lida com JS)
    const jinaResponse = await fetch(`https://r.jina.ai/${finalUrl}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
      signal: AbortSignal.timeout(15000)
    });

    if (!jinaResponse.ok) {
      console.log(`[analyze.js] Jina falhou: ${jinaResponse.status}`);
      return res.status(200).json({ success: true, skipped: true });
    }

    const rawText = await jinaResponse.text();
    const siteContent = rawText.substring(0, 5000).trim();
    console.log(`[analyze.js] Conteúdo obtido: ${siteContent.length} chars`);

    if (siteContent.length < 80) {
      return res.status(200).json({ success: true, skipped: true });
    }

    // 2. Determinando serviço ideal com base no que o lead respondeu
    const servicoIdeal = getService(bottleneck);

    // 3. Prompt de análise cruzada: site + respostas do chat + serviços Connect Ideia
    const prompt = `Você é o motor de inteligência da Connect Ideia, uma empresa de tecnologia e produtos digitais de alto nível. 
Seu papel é analisar o negócio de um potencial cliente e entregar um diagnóstico curto, cirúrgico e altamente persuasivo que mostre que entendemos profundamente o negócio dele — e que temos a solução certa.

## O que o cliente nos disse no chat:
- Fase atual: ${phase || 'Não informada'}
- Principal gargalo: ${bottleneck || 'Não informado'}

## Conteúdo real extraído do site do cliente (${finalUrl}):
${siteContent}

## O serviço Connect Ideia recomendado para esse perfil:
${servicoIdeal}

## Sua tarefa:
Analise o conteúdo do site e as respostas do cliente. Identifique:
1. O que esse negócio faz (segmento, produto, público)
2. O principal GAP digital que o site revela (falta de automação? sem captura de leads? LP fraca? sem atendimento digital?)
3. Como o gargalo que o cliente declarou se confirma (ou contrasta) com o que o site mostra

Depois, gere um diagnóstico em 3 partes curtas (1 frase cada), nesse formato JSON exato:
{
  "negocio": "frase curta identificando o negócio com precisão",
  "gap": "frase curta sobre o principal problema digital detectado no site",
  "acao": "frase conectando o gargalo do cliente com o que a Connect Ideia resolve ESPECIFICAMENTE"
}

Regras:
- Seja direto, profissional e empolgante
- Use dados reais do site, não invente
- A frase de ação deve mencionar um resultado tangível (ex: 3x mais leads, redução de 80% no tempo de atendimento)
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
      return res.status(200).json({ success: true, skipped: true });
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
    console.error('[analyze.js] Erro:', err.message);
    return res.status(200).json({ success: true, skipped: true });
  }
}
