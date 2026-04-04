import twilio from 'twilio';

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

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  const credCheck = {
    hasSid: !!accountSid,
    hasToken: !!authToken,
    hasFrom: !!fromNumber,
    sidLength: accountSid ? accountSid.length : 0,
    tokenLength: authToken ? authToken.length : 0,
    fromNumber: fromNumber
  };

  console.log('[whatsapp-send] Credenciais:', credCheck);

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[whatsapp-send] Credenciais faltando:', credCheck);
    return res.status(200).json({
      success: false,
      error: 'Credenciais Twilio faltando',
      debug: credCheck
    });
  }

  try {
    const { whatsapp, email, negocio, gap, acao } = req.body;

    if (!whatsapp) {
      return res.status(400).json({ error: 'WhatsApp é obrigatório' });
    }

    // Formata número para WhatsApp (adiciona whatsapp: se não tiver)
    let toNumber = whatsapp;

    // Remove prefixo whatsapp: se existir
    if (toNumber.startsWith('whatsapp:')) {
      toNumber = toNumber.replace('whatsapp:', '');
    }

    // Garante que tem + na frente
    if (!toNumber.startsWith('+')) {
      toNumber = '+' + toNumber.replace(/\D/g, '');
    } else if (!toNumber.match(/^\+\d+$/)) {
      // Remove caracteres não numéricos, mas mantém +
      toNumber = '+' + toNumber.replace(/\D/g, '');
    }

    // Adiciona prefixo whatsapp:
    toNumber = 'whatsapp:' + toNumber;

    // Monta a mensagem com o diagnóstico
    const message = `Oi! 👋

Recebemos seu contato. Analisamos seu site e aqui está nosso diagnóstico:

🏢 *${negocio || 'Seu negócio'}*
⚠️ *Gap:* ${gap || 'Identificamos oportunidades digitais'}
🚀 *Nossa solução:* ${acao || 'Ecossistema digital integrado'}

Vou passá-lo para nossa equipe. Em breve entramos em contato com a análise completa!`;

    console.log('[whatsapp-send] Enviando para:', toNumber);
    console.log('[whatsapp-send] Mensagem:', message);

    // Cria cliente Twilio e envia
    const client = twilio(accountSid, authToken);
    const messageResult = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message
    });

    console.log('[whatsapp-send] Sucesso:', messageResult.sid);

    return res.status(200).json({
      success: true,
      messageSid: messageResult.sid,
      email,
      whatsapp,
      message: 'Mensagem enviada com sucesso via Twilio'
    });

  } catch (err) {
    console.error('[whatsapp-send] Erro completo:', {
      message: err.message,
      code: err.code,
      status: err.status,
      details: err
    });
    // Não falha a requisição — apenas loga. O lead já foi salvo no Supabase
    return res.status(200).json({ success: true, warning: 'Erro ao enviar mensagem Twilio: ' + err.message });
  }
}
