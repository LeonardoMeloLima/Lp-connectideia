# Status do Projeto: ConnectIdeia - Otimização Mobile

## ✅ Concluído (Mobile)
- **Overlay do Globo**: O título "Transformamos negócios..." foi posicionado com sucesso sobre a imagem do globo usando `translateY`.
- **Limpeza do Footer**: 
    - E-mail e link de "Privacy Policy" ocultados no mobile para um visual minimalista.
    - Copyright fixado no rodapé com opacidade reduzida.
- **Hierarquia de CTA**: Botão de CTA flutuante reposicionado para não sobrepor o copyright.
- **Redução de Espaços**: O "vácuo" entre a seção do globo e o rodapé foi comprimido.

## ❌ Pendente / Bloqueado
- **Visibilidade do Navbar Mobile**: 
    - O navbar (logo + hamburguer) não renderiza corretamente apesar de estar presente no DOM.
    - **Tentativas Realizadas**:
        1. Criação de navbar customizado (`ci-nav-mobile`) no topo e base do body.
        2. Ativação forçada do header original via CSS (`display: flex !important`).
        3. Script de força bruta para resetar estilos após o carregamento da página.
    - **Observação**: Em uma tentativa, a barra de fundo apareceu, mas o conteúdo (logo e ícone) permaneceu invisível. Suspeita-se de conflito com o motor de transição (Barba.js) ou sistema de `prevent-flicker` que oculta elementos via JS durante o carregamento.

## 🎯 Próximos Passos
1. Investigar as camadas de `z-index` do `transition-wrapper` do Barba.js.
2. Tentar injetar o navbar via JS dinamicamente dentro do container ativo do Barba após a animação de entrada.
3. Verificar se há algum `overflow: hidden` ou `clip-path` no container pai cortando a barra fixa no topo.

**Data do Registro**: 07 de Abril de 2026
