import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Twilio envia via URL-encoded form
  if (req.method === 'POST') {
    try {
      const { From, Body, MessageSid } = req.body;

      console.log('[whatsapp-webhook] Mensagem recebida de:', From);
      console.log('[whatsapp-webhook] Conteúdo:', Body);

      const supabaseUrl = process.env.SUPABASE_URL || 'https://xmnltlazgmqqpenfxgfc.supabase.co';
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseKey) {
        console.error('[whatsapp-webhook] SUPABASE_ANON_KEY não configurada');
        return res.status(200).end(); // Twilio exige 200 mesmo em erro
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Cria tabela whatsapp_conversations se não existir
      // (pode ser criada via migration, mas aqui inserimos direto)
      const { data: existing, error: selectError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('from_number', From)
        .order('created_at', { ascending: false })
        .limit(1);

      // Salva a mensagem entrante
      const { error: insertError } = await supabase
        .from('whatsapp_conversations')
        .insert([
          {
            from_number: From,
            message_body: Body,
            message_sid: MessageSid,
            direction: 'incoming',
            created_at: new Date()
          }
        ]);

      if (insertError) {
        console.error('[whatsapp-webhook] Erro ao salvar:', insertError);
      }

      // Twilio exige resposta 200 imediatamente
      return res.status(200).end();

    } catch (err) {
      console.error('[whatsapp-webhook] Erro geral:', err.message);
      return res.status(200).end();
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
