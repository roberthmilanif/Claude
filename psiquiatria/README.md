# Psychiatry OS — V2

Cockpit clínico local-first para consulta psiquiátrica, pensado para manter a conversa com o paciente no centro e reduzir omissões na documentação.

## Fluxo principal

- modo **Próxima pergunta**, com fila adaptativa por sinais clínicos
- priorização automática de aprofundamento em suicídio, psicose, delirium e ativação maniforme
- entrevista longitudinal completa em modo roteiro
- exame do estado mental com descritores rápidos e complemento livre
- PHQ-9, GAD-7, AUDIT-C e ASRS-6 com cálculo e interpretação contextual
- modo emergência inspirado no SAFE-T, com fatores, investigação, julgamento, disposição e plano de segurança
- formulação diagnóstica, diferenciais, exclusões e 5 Ps
- biblioteca de psicofármacos com comparação lado a lado, referências de dose, cautelas, interações e monitorização
- plano farmacológico e não farmacológico
- evolução psiquiátrica automática, com pendências explícitas e sem converter “não explorado” em achado negativo

## Privacidade e instalação

Os dados são salvos apenas no `localStorage` do navegador. O aplicativo não possui backend nem envia informações clínicas. Há exportação opcional em JSON. O manifesto e o service worker permitem instalação como PWA em navegadores compatíveis.

Para uso local, sirva a pasta por HTTP:

```bash
python3 -m http.server 4173
```

## Segurança clínica

Ferramenta de apoio para profissional habilitado. Diagnóstico, estratificação de risco e prescrição exigem julgamento clínico e revisão de bula vigente, protocolo local, comorbidades, interações, função renal/hepática e contexto reprodutivo. Escalas organizam gravidade e seguimento; não fecham diagnóstico.

Base clínica declarada dentro do aplicativo: NICE NG222, NICE CG185, SAMHSA SAFE-T, VA/DoD MDD CPG e bulários regulatórios FDA.
