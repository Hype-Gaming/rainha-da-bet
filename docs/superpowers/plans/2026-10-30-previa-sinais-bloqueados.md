# Prévia de sinais bloqueados

## Objetivo

Apresentar uma prévia ilustrativa dos sinais quando o acesso for negado, explicando o saldo mínimo do jogo e oferecendo acesso ao fluxo de depósito existente. O jogo continua disponível independentemente da autorização dos sinais.

## Implementação

- Exibir uma prévia desfocada composta por conteúdo estático, sem dados recebidos pelo WebSocket.
- Usar a arte fornecida para o mínimo de R$ 10,00; para outros mínimos, mostrar um cartão com o nome do jogo e o valor retornado pela API.
- Abrir o modal de depósito existente pelo botão do cartão, preservando a verificação de acesso e suas regras.
- Reduzir a altura da área do jogo em telas móveis para diminuir as faixas vazias, mantendo uma altura mínima utilizável.

## Verificação

- Conferir os estados de acesso e a apresentação dos mínimos de R$ 10,00 e de outros valores, inclusive o botão de depósito.
- Verificar o layout móvel e a interação com o jogo em dispositivos de diferentes alturas.
- Executar o build do projeto quando as dependências estiverem disponíveis.
