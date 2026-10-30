# Acesso aos sinais por saldo e exceção

- O servidor exige sessão e confirma a identidade na API da plataforma. Por jogo, libera sinais quando o saldo BRL `available` é maior ou igual ao mínimo configurado (padrão R$ 10,00; aceita zero), ou quando o e-mail está na lista independente mantida no painel administrativo.
- As configurações ficam no MongoDB e as rotas administrativas exigem sessão de administrador. Valores são validados em centavos sem aritmética monetária de ponto flutuante.
- A página verifica a cada 15 segundos e ao recuperar foco; durante a verificação, oculta os sinais e preserva uma conexão já autorizada; em bloqueio ou falha, fecha o WebSocket, cancela reconexões e limpa os sinais. A mensagem de bloqueio informa jogo e mínimo.
- Limitação: o WebSocket é externo e o navegador conecta diretamente a ele. Esta alteração não impede que um cliente contorne a interface e acesse o serviço externo; proteção efetiva requer autenticação/autorização no próprio serviço ou um proxy controlado, fora deste escopo.
