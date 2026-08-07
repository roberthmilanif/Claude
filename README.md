# Claude

Configuração pessoal do Claude. Os servidores MCP com escopo de projeto ficam em [`.mcp.json`](.mcp.json), que o Claude Code carrega automaticamente ao iniciar uma sessão neste repositório.

## Servidor MCP Pierre Finance

O [`.mcp.json`](.mcp.json) conecta o Claude ao endpoint MCP do Pierre Finance (`https://pierre.finance/mcp`) por meio do [`mcp-remote`](https://www.npmjs.com/package/mcp-remote), que faz a ponte entre o servidor HTTP remoto e o transporte stdio, anexando um cabeçalho `Authorization`. Requer Node.js (para o `npx`).

### Configuração

1. Obtenha sua chave de API do Pierre Finance (`sk-...`).
2. Na pasta do repositório, rode o script de configuração e cole a chave quando solicitado — ela é gravada no seu perfil do shell, fora do repositório:

   ```bash
   ./setup.sh
   ```

   Ou, se preferir fazer manualmente, exporte-a no `~/.bashrc` ou `~/.zshrc`:

   ```bash
   export PIERRE_FINANCE_API_KEY="sk-..."
   ```

3. Inicie o Claude Code neste repositório e aprove o servidor MCP do projeto quando solicitado. `claude mcp list` deve então mostrar **Pierre Finance** como conectado.

O arquivo versionado nunca contém uma chave real. O `.mcp.json` lê a chave via [expansão de variável de ambiente](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json) `${PIERRE_FINANCE_API_KEY:-sk-your-api-key-here}`; enquanto a variável não estiver definida, o placeholder é usado e a autenticação simplesmente falha. Nunca substitua o placeholder por uma chave real neste arquivo rastreado pelo git.

### Como o cabeçalho é montado

O Claude Code expande `${PIERRE_FINANCE_API_KEY}` dentro do bloco `env` do servidor, produzindo `PIERRE_FINANCE_AUTH="Bearer sk-..."` no processo iniciado. O argumento `--header Authorization:${PIERRE_FINANCE_AUTH}` é então interpolado pelo próprio `mcp-remote` a partir desse ambiente — o [padrão documentado](https://www.npmjs.com/package/mcp-remote#custom-headers) para evitar espaços nos argumentos do cliente.

No Claude Code seria possível, alternativamente, dispensar o `mcp-remote` e usar o transporte HTTP nativo (`"type": "http"` com um mapa `headers`); a ponte stdio foi mantida por compatibilidade com clientes sem suporte a servidores remotos.

### Claude Desktop

O Claude Desktop não lê `.mcp.json` e não faz expansão de variáveis. Adicione o servidor ao `claude_desktop_config.json` com o token embutido — esse arquivo fica fora deste repositório, mas mesmo assim trate-o como um segredo:

```json
{
  "mcpServers": {
    "Pierre Finance": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://pierre.finance/mcp",
        "--header",
        "Authorization:${TOKEN}"
      ],
      "env": {
        "TOKEN": "Bearer sk-your-api-key-here"
      }
    }
  }
}
```
