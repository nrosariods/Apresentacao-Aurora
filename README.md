# TruckBem — Apresentação Institucional

Apresentação interativa de 14 slides em HTML5, CSS3 e JavaScript puro (sem frameworks).
Todo o conteúdo textual vem de `Conteúdo.txt`.

## Como usar

Abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).
Funciona direto do disco (`file://`) — não é necessário servidor.

### Navegação

| Ação | Como |
| --- | --- |
| Avançar / voltar | Setas ↓ ↑ / → ←, `PageDown` / `PageUp`, `Espaço`, scroll do mouse |
| Ir ao primeiro / último slide | `Home` / `End` |
| Ir a um slide específico | Clique nos pontos da navegação lateral (com tooltip do nome) |
| Tela cheia | Tecla `F` ou o botão no canto inferior direito |
| Touch | Swipe vertical |

A barra de progresso no topo acompanha o avanço da apresentação.

## Estrutura

```
index.html          apresentação completa (HTML + CSS + JS + sprite de ícones + mapa SVG)
Conteúdo.txt        fonte do texto de todos os slides
assets/
  logo-*.svg        variações do logo (branco, navy, empilhado branco)
  br-states.json    geometria dos estados do Brasil em paths SVG + centroides
  fleet/            fotos da frota
  gallery/          fotos do galpão e escritório
  clients/          logos dos clientes
tools/              scripts de build e verificação (opcional, veja abaixo)
TruckBem-Apresentacao-Institucional.pdf   export estático de 14 páginas
```

O arquivo `index.html` é autocontido: CSS, JavaScript, ícones e a geometria do mapa
estão embutidos, e as imagens são referenciadas localmente em `assets/`.
As fontes (Manrope e Inter) vêm do Google Fonts, com fallback para fontes do sistema
caso não haja conexão.

## Exportar em PDF

Use o próprio navegador: `Ctrl+P` → destino "Salvar como PDF", orientação paisagem,
margens "nenhuma" e "gráficos de plano de fundo" ativado. Há regras `@media print`
que expandem cada slide para uma página.

Alternativamente, com o Node instalado:

```bash
npm i puppeteer-core
node tools/pdf.js
```

## Scripts auxiliares (`tools/`)

Só são necessários para regerar o mapa ou revalidar o layout. Requerem
`npm i puppeteer-core` e Chrome instalado em
`C:\Program Files\Google\Chrome\Application\chrome.exe`.

| Script | Função |
| --- | --- |
| `build-map.js` | Converte um GeoJSON dos estados brasileiros em paths SVG simplificados (Douglas-Peucker) e grava `assets/br-states.json`. Precisa de `br.geojson` na raiz — baixe de um dataset público de UFs do Brasil. |
| `inject-map.js` | Injeta a geometria de `br-states.json` no `index.html`, no lugar do marcador `<!--#BR_MAP#-->`. |
| `shoot.js` | Captura screenshot de cada slide e roda auditoria de overflow. Uso: `node tools/shoot.js 1920 1080`. |
| `pdf.js` | Gera o PDF de 14 páginas. |

## Resoluções verificadas

Sem overflow em 1920×1080, 1600×900, 1366×768 e 1280×720. Abaixo de 1180px de largura
o layout passa a empilhar as colunas e os slides crescem em altura, com scroll normal.
