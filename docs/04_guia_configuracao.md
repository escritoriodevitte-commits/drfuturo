# drfuturo — Guia de Configuração

## 1. Pré-requisitos

- Navegador moderno (Chrome 100+, Firefox 100+, Edge 100+, Safari 15+)
- Chave de API da Z.AI (gratuita)
- Conexão com internet

## 2. Obter chave da Z.AI API

1. Acesse https://z.ai
2. Crie uma conta (login com Google/email)
3. Vá em **Manage API Key** → https://z.ai/manage-apikey/apikey-list
4. Clique em **Create new key**
5. Copie a chave (formato: `32hex.16chars`, ex: `474c6c0c23234325819b70b6f8b2ebd8.Hpem5Zsj1fXlcW2b`)
6. Guarde bem — ela não aparece novamente

## 3. Configurar no drfuturo

1. Abra o drfuturo no navegador
2. Vá na aba **⚙️ Config**
3. Em **Base URL**: mantenha `https://api.z.ai/api/v1` (padrão)
4. Em **API Key**: cole sua chave
5. Em **User ID** (opcional): identificador seu para tracking
6. Clique em **💾 Salvar config**
7. Clique em **⚡ Testar** — deve aparecer "✓ Conexão validada"

## 4. Verificar configuração

Após salvar e testar, vá na aba **💬 Chat** e faça uma pergunta simples:
- "Quando cabe HC versus RESE?"

Se a resposta vier em 5-10 segundos, está tudo certo.

## 5. Limites e custos da Z.AI

### Free tier
- Créditos iniciais ao criar conta
- Rate limiting: ~10 req/min
- Suficiente para teste e uso pessoal moderado

### Pago
- Cobrado por tokens (1k tokens ≈ US$ 0.01)
- Uso típico do drfuturo: ~50k tokens/dia = ~US$ 0.50/dia

## 6. DataJud CNJ API

**Não requer configuração!** É pública e gratuita.

Para confirmar, abra a aba **🔎 Processos** e consulte um processo conhecido:
- Ex: `0001327-64.2018.8.26.0100` (processo exemplo TJSP)

## 7. Deploy na Vercel

### Opção A: via GitHub (recomendado)

```bash
# Clone ou baixe o ZIP do drfuturo
cd drfuturo

# Inicialize git
git init
git add .
git commit -m "drfuturo v1.0"

# Suba para GitHub
git remote add origin https://github.com/SEU_USER/drfuturo.git
git branch -M main
git push -u origin main

# Na Vercel:
# 1. https://vercel.com/new
# 2. Importe o repositório drfuturo
# 3. Framework: detectado automaticamente como "Other"
# 4. Build Command: (vazio)
# 5. Output Directory: . (raiz)
# 6. Deploy
```

### Opção B: via Vercel CLI

```bash
npm i -g vercel
cd drfuturo
vercel
# Siga o wizard
```

### Opção C: arrastar e soltar
1. Acesse https://vercel.com/new
2. Arraste a pasta `drfuturo/` para a página
3. Deploy automático

## 8. Rodar localmente (sem deploy)

### Opção A: abrir direto no navegador
1. Extraia o ZIP
2. Abra `index.html` no Chrome
3. Configure a chave Z.AI na aba Config
4. Funciona (algumas features podem ter limitação de CORS em file://)

### Opção B: servidor local
```bash
cd drfuturo
python3 -m http.server 8080
# Abra http://localhost:8080
```

## 9. Backup dos dados

Periodicamente, exporte seus dados (ver `docs/03_seguranca_e_conformidade.md` seção 4) e salve em local seguro.

## 10. Suporte

- Issues: https://github.com/SEU_USER/drfuturo/issues
- Documentação completa: pasta `docs/`
- README.md tem troubleshooting
