import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS handling
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Supabase URL e Chave Pública/Secreta (vem do Vercel Env)
  const supabaseUrl = process.env.SUPABASE_URL || 'https://xmnltlazgmqqpenfxgfc.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY; 

  if (!supabaseKey) {
    console.error("ERRO: SUPABASE_ANON_KEY não foi configurada na Vercel.");
    return res.status(200).json({ success: true, warning: 'Simulated Save (No Key)' }); 
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { phase, bottleneck, site, timing, email, whatsapp, aiSummary } = req.body;

    // A tabela no seu Supabase precisa se chamar "leads_chat" e conter estas colunas
    // (ou edite a seu critério).
    const { data, error } = await supabase
      .from('leads_chat')
      .insert([
        { 
          phase, 
          bottleneck, 
          site_url: site, 
          timing, 
          email, 
          whatsapp,
          ai_summary: aiSummary, // O que a I.A respondeu pra ele fica guardado no CRM
          created_at: new Date()
        }
      ]);

    if (error) {
       console.error("Supabase Error:", error);
       throw error;
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Falha ao salvar o Lead:", err);
    return res.status(500).json({ error: 'Erro interno no servidor ao salvar lead' });
  }
}
