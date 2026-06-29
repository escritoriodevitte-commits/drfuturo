# drfuturo — Segurança e Conformidade LGPD

## 1. Modelo de segurança

### 1.1 Chave de API Z.AI

**Como é armazenada**: `localStorage` do navegador, sob a chave `zai_apikey`.

**Quem tem acesso**: Apenas o navegador do usuário. Não há servidor intermediário.

**Risco**: Qualquer script XSS no app poderia ler o `localStorage`. Mitigações:
- App 100% estático sem dependências externas (sem CDN de JS, apenas Google Fonts)
- CSP recomendada em produção (ver seção 5)
- Usuário pode limpar a chave a qualquer momento (botão "Limpar" na aba Config)

### 1.2 Comunicação

- ✅ Todo tráfego é HTTPS (Vercel força TLS 1.3)
- ✅ Chamadas para Z.AI usam header `Authorization: Bearer <key>`
- ✅ Chamadas para DataJud CNJ são públicas (sem auth)

### 1.3 Dados do usuário

| Dado | Onde fica | Quem vê |
|------|-----------|---------|
| Chave Z.AI | localStorage do navegador | Só o usuário |
| Conversas | localStorage do navegador | Só o usuário |
| Casos e notas | localStorage do navegador | Só o usuário |
| Sessões de audiência | localStorage do navegador | Só o usuário |
| Histórico de processos consultados | localStorage do navegador | Só o usuário |

**Nenhum dado é enviado para servidor do drfuturo** — não há servidor. Os dados só saem do navegador em 2 fluxos:
1. Z.AI API (para gerar respostas)
2. DataJud CNJ (consulta pública de processos)

## 2. Conformidade com LGPD

### 2.1 Base legal

O drfuturo processa dados pessoais apenas com base no **legitimo interesse** do próprio usuário (art. 7º, IX LGPD) — o usuário está usando a ferramenta para sua própria atividade profissional.

### 2.2 Direitos do titular

Como os dados ficam apenas no navegador do próprio usuário, todos os direitos LGPD são automaticamente atendidos:
- **Acesso**: o usuário acessa seus dados via DevTools (F12 → Application → Local Storage)
- **Correção**: o usuário edita diretamente
- **Eliminação**: o usuário clica em "Limpar" ou limpa o localStorage
- **Portabilidade**: o usuário pode exportar via JSON (ver seção 4)

### 2.3 Dados sensíveis

Atenção: ao colar texto de petições ou sentenças na aba Documentos (RAG), o usuário está enviando dados potencialmente sensíveis (CPF, nomes, fatos) para a Z.AI processar.

**Recomendação**: Anonimize dados sensíveis antes de colar. Usem iniciais em vez de nomes completos, ofusquem CPFs (`XXX.XXX.123-XX`).

## 3. Segurança da IA

### 3.1 Sanitização de prompts

O drfuturo não implementa sanitização automática de prompt injection ainda (planejado para v2.0). Mitigação atual:
- System prompt fixo e controlado pelo app (não pelo usuário)
- Inputs do usuário são passados como `user` message, não `system`

### 3.2 PII Masking

Não implementado na v1.0. Recomendação manual:
- Não cole documentos com CPF/RG de clientes diretamente
- Usem iniciais (J.S. em vez de João da Silva)
- Ofusquem números de documentos (`[CPF OFUSCADO]`)

## 4. Exportar / apagar todos os dados

### Exportar (portabilidade)
```javascript
// No console do navegador (F12):
const data = {};
['drfuturo_conversations', 'drfuturo_sessions', 'drfuturo_cases', 'drfuturo_lawsuits']
  .forEach(k => data[k] = JSON.parse(localStorage.getItem(k) || '[]'));
console.log(JSON.stringify(data, null, 2));
// Copie o output e salve como .json
```

### Apagar tudo
```javascript
// No console do navegador (F12):
['drfuturo_conversations', 'drfuturo_sessions', 'drfuturo_cases', 'drfuturo_lawsuits', 'zai_apikey', 'zai_baseurl', 'zai_userid']
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

Ou pelo botão "Limpar" na aba Config.

## 5. Recomendações para produção

### 5.1 Content Security Policy (CSP)

Adicionar no `vercel.json` ou via header:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.z.ai https://api-publica.datajud.cnj.jus.br;
  img-src 'self' data:;
```

### 5.2 HTTPS forçado
Vercel já força HTTPS por padrão. ✅

### 5.3 Headers de segurança
Recomendado adicionar via `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 6. Próximos passos (v2.0)

- ✅ MFA com NextAuth
- ✅ RBAC (admin, lawyer, intern)
- ✅ Logs de auditoria em Postgres
- ✅ Sanitização automática de PII antes de enviar para LLM
- ✅ Criptografia de dados sensíveis em repouso (Postgres + pgcrypto)
