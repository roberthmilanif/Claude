# Consulta Psiquiátrica

Estação de trabalho para a consulta psiquiátrica: anamnese, exame do estado mental,
escalas com pontuação automática, critérios diagnósticos, bulário, receituário e
protocolos de emergência. Página única, sem build, funciona offline depois do
primeiro carregamento.

**Nenhum dado de paciente sai do dispositivo.** Não há servidor, back-end nem envio
de telemetria. O rascunho da consulta fica em `localStorage`, apenas naquele navegador,
e é apagado pelo botão "Nova consulta".

## Módulos

| Módulo | O que faz |
|---|---|
| **Consulta** | Identificação, anamnese em 9 blocos e exame do estado mental em 16 domínios com campos estruturados + texto livre. |
| **Escalas** | 20 instrumentos com pontuação, faixa de gravidade, interpretação, alerta de item crítico e referência: PHQ-9, GAD-7, MADRS, YMRS, MDQ, C-SSRS, AUDIT, CIWA-Ar, CAGE, ASRS-6, Y-BOCS, PCL-5, RASS, MEEM, Bush-Francis, Barnes, AIMS, Epworth, EPDS, GDS-15. |
| **Diagnóstico** | 16 transtornos com os critérios do DSM-5-TR em paráfrase clínica, verificação automática de preenchimento (mínimo de itens + itens obrigatórios), especificadores, diferenciais e código CID-10. |
| **Bulário** | 63 psicofármacos: apresentações brasileiras, dose inicial/alvo/máxima, titulação, adversos, CYP, monitorização, ajuste renal e hepático, gestação/lactação, risco de QTc e classe de receituário. |
| **Receita** | Gerador em linha única e caixa alta, com separação automática por talonário (simples, controle especial branca 2 vias, notificação B azul, notificação A amarela). |
| **Emergência** | 12 protocolos: agitação, SNM, síndrome serotoninérgica, intoxicação por lítio, abstinência alcoólica/DT, catatonia, distonia/acatisia/discinesia, overdose de tricíclico, psicose puerperal, hiponatremia por psicofármaco, priapismo, primeiro episódio psicótico. |
| **Risco** | Fatores estáticos, dinâmicos e de proteção; estratificação em três níveis com conduta; plano de segurança em 6 passos; base legal da internação involuntária (Lei 10.216/2001). |
| **Especiais** | Gestação e lactação, idoso (Beers), pediatria com calculadora mg/kg, ajuste renal e hepático, QTc, CYP450, troca e retirada de antidepressivo, monitorização laboratorial, disfunção sexual e ganho de peso. |
| **Nota** | Compila em texto para colar no prontuário, com lista de pendências. Copiar, imprimir ou baixar `.txt`. |

## Duas regras de projeto

1. **O aplicativo não inventa dado clínico.** Campo não preenchido aparece como
   `[PENDENTE]` na nota — nunca é completado por plausibilidade.
2. **Sugestão do aplicativo não entra no prontuário.** Lembretes e checagens ficam em
   blocos destacados "Não entra no prontuário", fora do texto que vai ser copiado.

## Como rodar

```bash
# abrir direto
xdg-open index.html

# ou servir localmente
npx http-server . -p 8080
```

## Arquivos

```
index.html          página autônoma (uso local / GitHub Pages)
artifact.html       mesma página no formato de artifact publicado
app.css             tokens de cor e tipografia, tema claro e escuro
app.js              estado, roteador e as 9 views
data/farmacos.js    bulário
data/escalas.js     escalas e regras de pontuação
data/criterios.js   critérios diagnósticos e CID-10
data/protocolos.js  emergências, situações especiais, risco, EEM, doses pediátricas
```

## Aviso

Ferramenta de apoio à decisão para uso por médico. As doses, faixas e cortes foram
conferidos contra fontes de referência, mas a responsabilidade pela prescrição é de
quem assina. Referências estão citadas em cada instrumento e protocolo; onde a citação
exata não pôde ser confirmada, isso está escrito no próprio texto.
