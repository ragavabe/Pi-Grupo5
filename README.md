# Instruções para rodar o projeto

Passo 1: Clonar o repositório

Primeiro, é necessário baixar o projeto para sua máquina. Para isso, use o comando:
git clone https://github.com/ragavabe/Pi-Grupo5

Em seguida, entre na pasta do projeto:
cd PI-GRUPO5

Passo 2: Configurar variáveis de ambiente
Localize o arquivo chamado `.env.exemplo.`
Faça uma cópia dele e renomeie para `.env.`
Abra o arquivo .env e preencha as variáveis de acordo com as informações necessárias (exemplo: chave de API, porta do servidor).
Esse arquivo serve para guardar informações importantes de configuração do projeto.

Passo 3: Instalar dependências
Com o `Node.js` instalado na sua máquina, execute o comando:
`npm install`
Esse comando vai baixar todas as bibliotecas necessárias para o projeto funcionar.

Passo 4: Iniciar o servidor
Execute:
`node src/server.js`

Se tudo estiver configurado corretamente, o projeto ficará disponível em:
http://localhost:3000
ou na porta definida dentro do arquivo .env.

Navegação no aplicativo
Abra o navegador de sua preferência.
Acesse o link informado acima (http://localhost:3000).
Explore as páginas e funcionalidades do projeto conforme foram desenvolvidas.
