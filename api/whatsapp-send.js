// import twilio from 'twilio'; // TWILIO — comentado, usar Z-API abaixo

export default async function handler(req, res) {
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

  // ── TWILIO (comentado — descomentar para reverter) ──────────────────────────
  // const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // const authToken  = process.env.TWILIO_AUTH_TOKEN;
  // const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  // if (!accountSid || !authToken || !fromNumber) {
  //   return res.status(200).json({ success: false, error: 'Credenciais Twilio faltando' });
  // }
  // ────────────────────────────────────────────────────────────────────────────

  // ── Z-API ───────────────────────────────────────────────────────────────────
  const zapiInstanceId = process.env.ZAPI_INSTANCE_ID;
  const zapiToken      = process.env.ZAPI_TOKEN;

  if (!zapiInstanceId || !zapiToken) {
    console.error('[whatsapp-send] Credenciais Z-API faltando');
    return res.status(200).json({ success: false, error: 'Credenciais Z-API faltando' });
  }
  // ────────────────────────────────────────────────────────────────────────────

  try {
    const { whatsapp, email, negocio, gap, acao } = req.body;

    if (!whatsapp) {
      return res.status(400).json({ error: 'WhatsApp é obrigatório' });
    }

    // Formata número: Z-API usa formato 5511999999999 (sem + e sem whatsapp:)
    let toNumber = whatsapp.replace(/\D/g, '');
    if (!toNumber.startsWith('55')) {
      toNumber = '55' + toNumber;
    }

    // Monta a mensagem com o diagnóstico
    const message = `Oi! 👋

Recebemos seu contato. Analisamos seu site e aqui está nosso diagnóstico:

🏢 *${negocio || 'Seu negócio'}*
⚠️ *Gap:* ${gap || 'Identificamos oportunidades digitais'}
🚀 *Nossa solução:* ${acao || 'Ecossistema digital integrado'}

Vou passá-lo para nossa equipe. Em breve entramos em contato com a análise completa!`;

    console.log('[whatsapp-send] Enviando para:', toNumber);

    // ── TWILIO (comentado) ───────────────────────────────────────────────────
    // const client = twilio(accountSid, authToken);
    // const messageResult = await client.messages.create({
    //   from: fromNumber,
    //   to: 'whatsapp:+' + toNumber,
    //   body: message
    // });
    // console.log('[whatsapp-send] Twilio SID:', messageResult.sid);
    // ────────────────────────────────────────────────────────────────────────

    // ── Z-API ────────────────────────────────────────────────────────────────
    const zapiRes = await fetch(
      `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': process.env.ZAPI_CLIENT_TOKEN
        },
        body: JSON.stringify({ phone: toNumber, message })
      }
    );
    const zapiData = await zapiRes.json();
    console.log('[whatsapp-send] Z-API resposta:', zapiData);
    // ────────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      email,
      whatsapp,
      message: 'Mensagem enviada com sucesso via Z-API'
    });

  } catch (err) {
    console.error('[whatsapp-send] Erro:', err.message);
    // Não falha a requisição — o lead já foi salvo no Supabase
    return res.status(200).json({ success: true, warning: 'Erro ao enviar mensagem: ' + err.message });
  }
}
