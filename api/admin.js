// Updated: 2026-04-03 - Force Vercel redeploy
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'connectideia2025';
  const cookies = req.headers.cookie || '';
  const isAuthenticated = cookies.includes(`admin_auth=${ADMIN_PASSWORD}`);

  if (!isAuthenticated && req.method === 'GET') {
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login — ConnectIdeia</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; background: linear-gradient(135deg, #0f0f0f 0%, #333 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .login-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
    h1 { font-size: 24px; margin-bottom: 10px; text-align: center; color: #0f0f0f; }
    p { text-align: center; color: #999; margin-bottom: 30px; font-size: 14px; }
    input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 15px; }
    button { width: 100%; padding: 12px; background: #0f0f0f; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; }
    .error { color: #c62828; font-size: 12px; display: none; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>ConnectIdeia — Admin</h1>
    <p>Painel de atendimento</p>
    <form onsubmit="handleLogin(event)">
      <input type="password" id="password" placeholder="Digite a senha" required>
      <div class="error" id="errorMsg">Senha incorreta</div>
      <button type="submit">Acessar</button>
    </form>
  </div>
  <script>
    function handleLogin(e) {
      e.preventDefault();
      const pass = document.getElementById('password').value;
      fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      }).then(r => r.json()).then(data => {
        if (data.success) {
          document.cookie = \`admin_auth=\${pass}; path=/; max-age=86400\`;
          location.reload();
        } else {
          document.getElementById('errorMsg').style.display = 'block';
          document.getElementById('password').value = '';
        }
      });
    }
  </script>
</body>
</html>`);
  }

  return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — ConnectIdeia Leads</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; background: #f5f5f5; color: #222; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: #0f0f0f; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    header h1 { font-size: 28px; margin-bottom: 5px; }
    header p { font-size: 14px; opacity: 0.8; }
    .filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    input, select { padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    button { padding: 10px 20px; background: #0f0f0f; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .leads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .lead-card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 20px; cursor: pointer; }
    .lead-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .lead-email { font-weight: 600; margin-bottom: 10px; }
    .lead-info { font-size: 13px; color: #666; }
    .empty-state { text-align: center; padding: 40px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>ConnectIdeia — Leads</h1>
      <p>Painel de atendimento e conversas via WhatsApp</p>
    </header>

    <div class="filters">
      <input type="email" id="filterEmail" placeholder="Filtrar por e-mail...">
      <select id="filterPhase">
        <option value="">Todas as fases</option>
        <option value="Ideia / Início">Ideia / Início</option>
        <option value="Operação">Operação</option>
        <option value="Escala">Escala</option>
      </select>
      <select id="filterBottleneck">
        <option value="">Todos os gargalos</option>
        <option value="Criar uma LP que vende">LP que vende</option>
        <option value="Criar um App/PWA">App/PWA</option>
        <option value="Automatizar processos">Automatizar processos</option>
        <option value="Ecossistema completo">Ecossistema completo</option>
      </select>
      <button onclick="loadLeads()">Filtrar</button>
    </div>

    <div id="leadsContainer" class="leads-grid">
      <div style="text-align: center; color: #999;">Carregando...</div>
    </div>
  </div>

  <script>
    async function loadLeads() {
      const email = document.getElementById('filterEmail').value;
      const phase = document.getElementById('filterPhase').value;
      const bottleneck = document.getElementById('filterBottleneck').value;

      const params = new URLSearchParams();
      if (email) params.set('email', email);
      if (phase) params.set('phase', phase);
      if (bottleneck) params.set('bottleneck', bottleneck);
      const query = params.toString();

      const res = await fetch(\`/api/get-leads?\${query}\`);
      const leads = await res.json();
      const container = document.getElementById('leadsContainer');

      if (!leads || !leads.length) {
        container.innerHTML = '<div class="empty-state"><h2>Nenhum lead encontrado</h2></div>';
        return;
      }

      container.innerHTML = leads.map(lead => {
        const waNumber = lead.whatsapp ? lead.whatsapp.replace(/\D/g, '') : null;
        const waLink = waNumber ? \`https://wa.me/\${waNumber}\` : null;
        return \`
        <div class="lead-card">
          <div class="lead-email">\${lead.email}</div>
          <div class="lead-info">
            <div>Fase: \${lead.phase || '—'}</div>
            <div>Gargalo: \${lead.bottleneck || '—'}</div>
            <div>Data: \${new Date(lead.created_at).toLocaleDateString('pt-BR')}</div>
            \${waLink ? \`<div style="margin-top:8px"><a href="\${waLink}" target="_blank" style="display:inline-block;background:#25D366;color:white;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">📱 \${lead.whatsapp}</a></div>\` : ''}
          </div>
        </div>\`;
      }).join('');
    }

    loadLeads();
  </script>
</body>
</html>`);
}
