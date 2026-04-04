import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://xmnltlazgmqqpenfxgfc.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    console.error("ERRO: SUPABASE_ANON_KEY não foi configurada");
    return res.status(500).json({ error: 'Chave Supabase não configurada' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, phase, bottleneck } = req.query;

    let query = supabase.from('leads_chat').select('*').order('created_at', { ascending: false });

    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (phase) {
      query = query.eq('phase', phase);
    }
    if (bottleneck) {
      query = query.eq('bottleneck', bottleneck);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    return res.status(200).json(data || []);

  } catch (err) {
    console.error("Erro ao buscar leads:", err);
    return res.status(500).json({ error: 'Erro ao buscar leads' });
  }
}
