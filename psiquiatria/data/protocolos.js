/* Protocolos de emergência, situações especiais, risco e tabelas de referência. */
window.PSIQ_PROTOCOLOS = {

emergencias:[

{id:"agitacao", nome:"Agitação psicomotora", cor:"crit",
 gatilho:"Paciente agitado, ameaçador ou com risco iminente de auto/heteroagressão.",
 blocos:[
  {t:"1. Antes de qualquer fármaco — descartar causa orgânica", itens:[
    "GLICEMIA CAPILAR em todo agitado. Sempre.",
    "Sinais vitais completos + oximetria + temperatura.",
    "Pensar em: hipóxia, hipoglicemia, TCE, infecção/sepse, abstinência (álcool, benzodiazepínico), intoxicação, AVC, encefalite, dor, retenção urinária, fecaloma.",
    "Agitação de início súbito em paciente sem história psiquiátrica = orgânico até prova em contrário."]},
  {t:"2. Desescalonamento verbal (sempre a primeira medida)", itens:[
    "Ambiente calmo, 2 rotas de saída, remover objetos perigosos, equipe visível mas não cercando.",
    "Um único interlocutor, distância de 2 braços, tom baixo, oferecer escolhas ('prefere o comprimido ou a injeção?').",
    "Oferecer medicação ORAL primeiro — orodispersível quando disponível."]},
  {t:"3. Agitação leve a moderada, aceita via oral", itens:[
    "Risperidona 1–2 mg VO (solução oral age rápido) OU olanzapina 10 mg orodispersível OU quetiapina 25–100 mg.",
    "Se componente ansioso/abstinência: diazepam 5–10 mg VO ou clonazepam 0,5–2 mg VO.",
    "Reavaliar em 30–60 min antes de repetir."]},
  {t:"4. Agitação grave, recusa via oral — contenção química IM", itens:[
    "ESQUEMA COM MELHOR EVIDÊNCIA: Haloperidol 5 mg + Prometazina 25–50 mg IM (ensaios TREC) — mais rápido e com menos eventos que haloperidol isolado.",
    "Alternativa: Olanzapina 10 mg IM (NÃO associar a benzodiazepínico IM — risco de depressão cardiorrespiratória; separar ≥1 h).",
    "Alternativa: Midazolam 5–7,5 mg IM (início mais rápido, maior risco respiratório — ter via aérea e oximetria).",
    "Idoso: metade da dose. Delirium em idoso: haloperidol 0,25–0,5 mg.",
    "Reavaliar a cada 30 min; dose máxima de haloperidol 20 mg/dia."]},
  {t:"5. Depois da contenção", itens:[
    "Contenção física somente com prescrição médica, ≥4 pontos, reavaliação a cada 30 min, registro em prontuário e retirada na primeira oportunidade.",
    "Monitorizar: nível de consciência, FR, SpO2, PA, temperatura.",
    "ECG assim que possível se houve antipsicótico (QTc).",
    "Profilaxia de TVP se contenção prolongada.",
    "Reavaliar a causa — a sedação não é o tratamento, é a janela para investigar."]}],
 ref:"Ensaios TREC (BMJ 2003 e 2007) — haloperidol+prometazina IM. Project BETA (West J Emerg Med 2012) para desescalonamento verbal."},

{id:"snm", nome:"Síndrome Neuroléptica Maligna", cor:"crit",
 gatilho:"Febre + rigidez 'em cano de chumbo' + disautonomia + rebaixamento, em uso de antipsicótico (ou retirada abrupta de dopaminérgico).",
 blocos:[
  {t:"Reconhecimento", itens:[
    "Tétrade: HIPERTERMIA (>38 °C) + RIGIDEZ MUSCULAR GENERALIZADA + alteração do nível de consciência + instabilidade autonômica.",
    "Laboratório: CPK muito elevada (frequentemente >1.000), leucocitose, ↑transaminases, acidose metabólica, mioglobinúria.",
    "Instalação em 24–72 h, tipicamente na 1ª–2ª semana após início ou aumento do antipsicótico.",
    "Também ocorre com antieméticos (metoclopramida, bromoprida) e com retirada abrupta de levodopa."]},
  {t:"Conduta imediata", itens:[
    "SUSPENDER o antipsicótico (ou reintroduzir o dopaminérgico retirado). Esta é a medida principal.",
    "Suporte em UTI: hidratação vigorosa, resfriamento ativo, correção eletrolítica.",
    "Prevenir insuficiência renal por rabdomiólise: volume + débito urinário alvo.",
    "Benzodiazepínico (lorazepam/diazepam) para agitação e rigidez leve.",
    "Casos graves: bromocriptina 2,5–5 mg VO 3×/dia e/ou dantroleno 1–2,5 mg/kg IV.",
    "Refratário ou com catatonia: ECT é opção estabelecida.",
    "Profilaxia de TVP — mortalidade por TEP é relevante nesta síndrome."]},
  {t:"Depois", itens:[
    "Reintrodução de antipsicótico: aguardar ≥2 semanas após resolução completa; preferir atípico de baixa potência, dose baixa, titulação lenta, monitorizar CPK.",
    "Risco de recorrência é real — documentar em prontuário e orientar o paciente."]},
 ],
 ref:"Diferencial obrigatório com síndrome serotoninérgica (ver ao lado), hipertermia maligna, catatonia maligna, golpe de calor, encefalite, sepse."},

{id:"serotoninergica", nome:"Síndrome Serotoninérgica", cor:"crit",
 gatilho:"Início em HORAS após adição/aumento de serotoninérgico: clônus + hiperreflexia + agitação + hipertermia.",
 blocos:[
  {t:"Reconhecimento — o que separa da SNM", itens:[
    "Início em HORAS (SNM: dias). CLÔNUS e HIPERREFLEXIA, predominando em membros INFERIORES (SNM: rigidez generalizada e hiporreflexia).",
    "Midríase, diarreia, hiperperistalse (SNM: sem diarreia).",
    "Critérios de Hunter: presença de serotoninérgico + (clônus espontâneo) OU (clônus induzível/ocular + agitação ou diaforese) OU (tremor + hiperreflexia) OU (hipertonia + T>38 °C + clônus).",
    "CPK pode subir, mas a rigidez não é o achado dominante."]},
  {t:"Combinações que causam", itens:[
    "IMAO + qualquer serotoninérgico (a mais letal).",
    "ISRS/IRSN + TRAMADOL — a combinação mais frequente na prática brasileira.",
    "Linezolida, azul de metileno, fentanil, meperidina, dextrometorfano, triptanos, ondansetrona, lítio, MDMA, triptofano, erva-de-são-joão.",
    "ISRS + inibidor do seu CYP (ex.: fluoxetina elevando o nível de outro serotoninérgico)."]},
  {t:"Conduta", itens:[
    "SUSPENDER todos os agentes serotoninérgicos.",
    "Suporte: hidratação, resfriamento, monitorização.",
    "Benzodiazepínico em dose generosa é o pilar do tratamento (controla agitação, clônus, hipertermia).",
    "Casos moderados a graves: ciproeptadina 12 mg VO em dose inicial, depois 2 mg a cada 2 h (antagonista 5-HT2A).",
    "Hipertermia grave (>41,1 °C): sedação, bloqueio neuromuscular e intubação — NÃO usar antipiréticos (a febre é muscular, não hipotalâmica).",
    "EVITAR: haloperidol e demais antipsicóticos (pioram a hipertermia), succinilcolina se hipercalemia por rabdomiólise, bromocriptina, dantroleno."]}],
 ref:"Boyer EW, Shannon M. N Engl J Med. 2005;352(11):1112-20. Critérios de Hunter: Dunkley EJ et al. QJM 2003."},

{id:"litio", nome:"Intoxicação por lítio", cor:"crit",
 gatilho:"Paciente em lítio com vômito, tremor grosseiro, ataxia, confusão — ou simplesmente desidratado.",
 blocos:[
  {t:"Gravidade por nível sérico (dosar 12 h após a última dose)", itens:[
    "0,6–1,2 mEq/L: faixa terapêutica.",
    "1,2–1,5: efeitos adversos — tremor fino, poliúria, náusea.",
    "1,5–2,5: INTOXICAÇÃO — tremor grosseiro, ataxia, disartria, vômito, diarreia, fasciculação, letargia.",
    "2,5–3,5: grave — convulsão, mioclonia, arritmia, rebaixamento.",
    ">3,5: risco de morte — hemodiálise indicada.",
    "ATENÇÃO: na intoxicação CRÔNICA, o quadro neurológico é grave com níveis mais baixos que na aguda — trate pelo paciente, não pelo número."]},
  {t:"O que desencadeia (procure ativamente)", itens:[
    "Desidratação, vômito, diarreia, febre, calor, restrição de sódio.",
    "AINEs (o gatilho mais comum na prática ambulatorial), IECA/BRA, tiazídicos, metronidazol.",
    "Lesão renal aguda de qualquer causa.",
    "Erro de dose ou tentativa de suicídio."]},
  {t:"Conduta", itens:[
    "SUSPENDER o lítio. Colher litemia, função renal, eletrólitos, ECG.",
    "Hidratação com soro fisiológico 0,9% — restaurar volemia aumenta a depuração renal.",
    "NÃO usar diurético de alça nem tiazídico (pioram).",
    "Carvão ativado NÃO adsorve lítio; lavagem gástrica só em ingestão maciça e muito recente.",
    "HEMODIÁLISE: nível >4,0 (aguda) ou >2,5 com sintomas neurológicos/insuficiência renal, ou clínica grave independentemente do nível. Pode haver REBOTE do nível após a diálise (redistribuição) — redosar em 6–8 h.",
    "Sequela neurológica permanente (SILENT — síndrome cerebelar) é possível: não subestime o quadro neurológico."]}],
 ref:"Todo paciente em lítio que chega ao PS vomitando deve ter litemia colhida ANTES da próxima dose."},

{id:"abstinencia", nome:"Abstinência alcoólica e Delirium Tremens", cor:"crit",
 gatilho:"Etilista que parou de beber há 6–72 h com tremor, sudorese, taquicardia, ansiedade.",
 blocos:[
  {t:"Linha do tempo", itens:[
    "6–12 h: tremor, ansiedade, náusea, sudorese, taquicardia (abstinência menor).",
    "12–24 h: alucinose alcoólica — alucinações com SENSÓRIO PRESERVADO (não é delirium).",
    "24–48 h: convulsão tônico-clônica generalizada ('rum fits').",
    "48–96 h: DELIRIUM TREMENS — confusão flutuante, alucinação, agitação, hipertermia, disautonomia. Mortalidade de até 5% mesmo tratada."]},
  {t:"Tratamento", itens:[
    "TIAMINA 300 mg IV/IM ANTES de qualquer glicose. Wernicke estabelecida: 500 mg IV 3×/dia por 2–3 dias.",
    "Repor magnésio e potássio — hipomagnesemia mantém tremor e convulsão refratários.",
    "Benzodiazepínico sintoma-guiado pelo CIWA-Ar: diazepam 10–20 mg VO a cada 1–2 h até CIWA<8 (reduz dose total e duração vs. esquema fixo).",
    "Hepatopata ou idoso: LORAZEPAM (glicuronidação, sem metabólito ativo acumulável).",
    "DT estabelecido: diazepam IV titulado até sedação leve; se refratário a doses altas, fenobarbital ou propofol em UTI.",
    "Antipsicótico APENAS como adjuvante para alucinação — nunca isolado (reduz limiar convulsivo e não previne DT).",
    "Rastrear o que mais está acontecendo: hematoma subdural, pancreatite, hepatite alcoólica, infecção, hipoglicemia."]},
  {t:"Quando NÃO usar CIWA", itens:[
    "Paciente que não comunica (intubado, barreira linguística, delirium franco) — use esquema fixo com reavaliação clínica.",
    "História de convulsão ou DT prévios — considere profilaxia em esquema fixo, não sintoma-guiada."]}],
 ref:"Sullivan JT et al. Br J Addict 1989 (CIWA-Ar); Saitz R et al. JAMA 1994 (sintoma-guiado)."},

{id:"catatonia", nome:"Catatonia", cor:"warn",
 gatilho:"Imobilidade, mutismo, negativismo, postura fixa — no PS, na enfermaria ou na UTI.",
 blocos:[
  {t:"Reconhecimento", itens:[
    "≥3 de 12 achados do DSM-5-TR: estupor, catalepsia, flexibilidade cérea, mutismo, negativismo, postura, maneirismo, estereotipia, agitação sem estímulo, careta, ecolalia, ecopraxia.",
    "Ocorre em transtorno do humor (o mais frequente!), psicose, autismo e em CONDIÇÃO MÉDICA — encefalite autoimune, lúpus, infecção, distúrbio metabólico.",
    "CATATONIA MALIGNA: catatonia + febre + disautonomia + rigidez — indistinguível da SNM e igualmente letal."]},
  {t:"Teste do lorazepam (diagnóstico e terapêutico)", itens:[
    "Lorazepam 1–2 mg VO/SL (ou IV onde disponível) e reavaliar em 15–30 min (5–10 min se IV).",
    "Resposta parcial já confirma. Manter 1–2 mg 3×/dia e titular — pode ser necessário 8–16 mg/dia.",
    "Sem resposta em 48–72 h, ou forma maligna: ELETROCONVULSOTERAPIA, que é o tratamento mais eficaz."]},
  {t:"Armadilha que mata", itens:[
    "ANTIPSICÓTICO PODE PRECIPITAR CATATONIA MALIGNA/SNM — suspenda o antipsicótico no paciente catatônico.",
    "Catatonia hipoativa é rotineiramente rotulada como 'depressão grave' ou 'delirium hipoativo' e recebe justamente o antipsicótico.",
    "Complicações do estupor: TVP/TEP, pneumonia aspirativa, desidratação, lesão por pressão, rabdomiólise. Profilaxia de TVP é obrigatória."]}],
 ref:"Bush G et al. Acta Psychiatr Scand 1996; DSM-5-TR."},

{id:"distonia", nome:"Distonia aguda e reações extrapiramidais", cor:"warn",
 gatilho:"Horas a dias após antipsicótico (ou metoclopramida/bromoprida): torcicolo, trismo, crise oculógira, protrusão da língua.",
 blocos:[
  {t:"Distonia aguda — resolve em minutos", itens:[
    "Biperideno 2–5 mg IM/IV lento (ou prometazina 25–50 mg IM se não houver biperideno).",
    "Resposta em 5–20 min. Repetir se necessário.",
    "LARINGOESPASMO é a forma que mata — via aérea é prioridade.",
    "Manter anticolinérgico VO por 24–48 h e reavaliar o antipsicótico.",
    "Mais comum em: homem jovem, alta potência (haloperidol), primeira exposição, dose alta."]},
  {t:"Acatisia — não é piora da psicose", itens:[
    "Inquietação interna intolerável, não consegue ficar parado, troca o peso de perna.",
    "PROPRANOLOL 20–40 mg 2–3×/dia é o tratamento de escolha. Biperideno NÃO funciona.",
    "Alternativas: reduzir dose, trocar antipsicótico, benzodiazepínico como ponte, mirtazapina 15 mg.",
    "Fator de risco para suicídio — leve a sério."]},
  {t:"Parkinsonismo induzido", itens:[
    "Bradicinesia, rigidez, tremor, fácies em máscara, semanas após início.",
    "Primeira medida: REDUZIR a dose ou trocar por antipsicótico de menor afinidade D2 (quetiapina, clozapina).",
    "Biperideno só se não for possível ajustar — e nunca cronicamente no idoso (delirium, piora cognitiva e da discinesia tardia)."]},
  {t:"Discinesia tardia", itens:[
    "Meses a anos de uso. Movimentos coreiformes orofaciais, língua, tronco.",
    "SUSPENDER o anticolinérgico (piora). Reduzir/trocar o antipsicótico — clozapina tem a menor propensão.",
    "Aumentar a dose mascara temporariamente e piora a evolução.",
    "Inibidores de VMAT2 (valbenazina, deutetrabenazina) são o tratamento específico — disponibilidade no Brasil a confirmar."]}],
 ref:"AIMS a cada 6 meses (3 meses se antipsicótico típico) em todo paciente em uso crônico."},

{id:"adt", nome:"Intoxicação por antidepressivo tricíclico", cor:"crit",
 gatilho:"Ingestão intencional em paciente com amitriptilina/nortriptilina/clomipramina em casa.",
 blocos:[
  {t:"Reconhecimento", itens:[
    "Rebaixamento + anticolinérgico (midríase, pele seca e quente, retenção, íleo) + cardiotoxicidade + convulsão.",
    "ECG é o exame que decide: QRS >100 ms prediz convulsão; QRS >160 ms prediz arritmia ventricular.",
    "Onda R proeminente em aVR (>3 mm) é sinal clássico de bloqueio de canal de sódio.",
    "Deterioração pode ser abrupta — paciente 'bem' pode convulsionar e parar em minutos."]},
  {t:"Conduta", itens:[
    "BICARBONATO DE SÓDIO 1–2 mEq/kg IV em bólus se QRS >100 ms, hipotensão ou arritmia — repetir até estreitar o QRS; alvo de pH 7,45–7,55.",
    "Carvão ativado se via aérea protegida e ingestão <2 h.",
    "Convulsão: benzodiazepínico. EVITAR fenitoína.",
    "Hipotensão: volume + bicarbonato; vasopressor de escolha é noradrenalina.",
    "EVITAR: flumazenil (convulsão), antiarrítmicos classe IA/IC, betabloqueador.",
    "Observação em monitorização por ≥6 h mesmo se assintomático; alta só com ECG normal e sensório normal."]}],
 ref:"Lembre-se de por que isso importa na prescrição: 10 dias de amitriptilina em dose plena são potencialmente letais. Em paciente com risco suicida, prescreva quantidade fracionada."},

{id:"puerperal", nome:"Psicose puerperal", cor:"crit",
 gatilho:"Puérpera nas primeiras 2 semanas com confusão flutuante, delírio, alucinação, insônia total.",
 blocos:[
  {t:"Reconhecimento", itens:[
    "Incidência 1–2:1.000 partos. Início ABRUPTO, geralmente nos primeiros 14 dias.",
    "Quadro com flutuação tipo delirium, delírios frequentemente envolvendo o bebê, desorganização.",
    "Forte associação com transtorno bipolar — na maioria das vezes é um episódio afetivo com psicose.",
    "RISCO DE SUICÍDIO E DE INFANTICÍDIO. É emergência psiquiátrica."]},
  {t:"Conduta", itens:[
    "INTERNAÇÃO. Não manejar ambulatorialmente. Nunca deixar mãe e bebê sem supervisão.",
    "Excluir causa orgânica: infecção puerperal, eclâmpsia, tireoidite pós-parto, encefalite autoimune, hemorragia, trombose venosa cerebral.",
    "Antipsicótico + estabilizador (lítio tem boa evidência no quadro afetivo puerperal).",
    "ECT é altamente eficaz e segura nesta situação, especialmente com recusa alimentar ou risco elevado.",
    "Decidir sobre a amamentação em conjunto com a paciente e a família, considerando o fármaco e a necessidade de sono."]}],
 ref:"Diferenciar de blues puerperal (50–80%, autolimitado, até 2 semanas) e de depressão pós-parto (rastreio com EPDS)."},

{id:"hiponatremia", nome:"Hiponatremia por psicofármaco (SIADH)", cor:"warn",
 gatilho:"Idoso iniciando ISRS/IRSN ou carbamazepina/oxcarbazepina, com confusão, queda, náusea ou 'piora da demência'.",
 blocos:[
  {t:"Quem e quando", itens:[
    "ISRS/IRSN: nas primeiras 2–4 semanas; risco maior em mulher, idoso, baixo peso, uso de tiazídico.",
    "Oxcarbazepina (até 25%) > carbamazepina. Também antipsicóticos e ADT, com menor frequência.",
    "Sintomas inespecíficos: náusea, cefaleia, letargia, confusão, queda. Na+ <125 pode convulsionar."]},
  {t:"Conduta", itens:[
    "Dosar Na+ basal e em 2–4 semanas em todo idoso que inicia ISRS/IRSN.",
    "Confirmado o SIADH: suspender o agente, restrição hídrica, corrigir de acordo com a gravidade e a cronicidade.",
    "Correção rápida em hiponatremia crônica = mielinólise pontina. Respeite os limites (≤8–10 mEq/L em 24 h).",
    "Troca: mirtazapina, bupropiona ou agomelatina têm menor associação com SIADH."]}],
 ref:"Diagnóstico exige osmolaridade sérica baixa, osmolaridade urinária inapropriadamente alta e Na+ urinário >30, com euvolemia."},

{id:"priapismo", nome:"Priapismo por trazodona", cor:"warn",
 gatilho:"Ereção dolorosa e prolongada (>4 h) em paciente usando trazodona.",
 blocos:[
  {t:"Conduta", itens:[
    "É EMERGÊNCIA UROLÓGICA — >4 h leva a fibrose e disfunção erétil permanente.",
    "Suspender a trazodona imediatamente; encaminhar ao urologista sem esperar.",
    "Tratamento: aspiração do corpo cavernoso e/ou fenilefrina intracavernosa.",
    "Incidência aproximada de 1:6.000 — baixa, mas previsível se o paciente não for orientado.",
    "Também descrito com antipsicóticos de bloqueio α1 (clorpromazina, risperidona)."]}],
 ref:"Orientar TODO paciente do sexo masculino ao prescrever trazodona — é uma frase que evita uma sequela permanente."},

{id:"primeiro-episodio", nome:"Primeiro episódio psicótico — descartar orgânico", cor:"info",
 gatilho:"Primeira psicose, sobretudo com início atípico, idade atípica ou achado neurológico.",
 blocos:[
  {t:"Sinais de alerta para causa orgânica", itens:[
    "Idade <15 ou >40 anos no primeiro episódio.",
    "Início agudo em horas/dias, com flutuação do nível de consciência.",
    "Alucinações VISUAIS, olfativas ou táteis predominando (as psicoses primárias são predominantemente auditivas).",
    "Sinal neurológico focal, convulsão, disautonomia, movimentos anormais.",
    "Febre, rigidez de nuca, cefaleia.",
    "Ausência total de história familiar e de pródromos."]},
  {t:"Investigação mínima", itens:[
    "Hemograma, glicemia, eletrólitos (Na+, K+, Ca++, Mg++), função renal e hepática, TSH, B12, folato.",
    "VDRL/FTA-Abs, anti-HIV, PCR/VHS.",
    "Toxicológico de urina (cocaína, anfetamina, canabinoide).",
    "Neuroimagem (TC ou preferencialmente RM de crânio).",
    "EEG se suspeita de epilepsia de lobo temporal ou estado de mal não convulsivo.",
    "Punção lombar e anticorpos anti-NMDA se suspeita de encefalite autoimune (psicose + convulsão + disautonomia + discinesia orofacial em mulher jovem).",
    "Ceruloplasmina e cobre urinário em jovem com sintomas neuropsiquiátricos (Wilson)."]}],
 ref:"Antipsicótico em encefalite anti-NMDA não tratada apenas mascara e pode provocar sensibilidade extrapiramidal grave."}
],

/* ============ SITUAÇÕES ESPECIAIS ============ */
especiais:[

{id:"gestacao", nome:"Gestação e lactação", cor:"warn",
 blocos:[
  {t:"Princípios", itens:[
    "Depressão e psicose NÃO TRATADAS na gestação têm risco próprio: prematuridade, baixo peso, pré-eclâmpsia, suicídio (uma das principais causas de morte materna).",
    "A decisão é sempre risco do fármaco versus risco da doença — nunca 'suspender tudo por segurança'.",
    "Preferir monoterapia, na menor dose eficaz, com o fármaco que já funcionou para esta paciente.",
    "Documentar a discussão de riscos e benefícios no prontuário."]},
  {t:"Antidepressivos", itens:[
    "SERTRALINA é a primeira escolha na gestação e na lactação (menor transferência para o leite).",
    "EVITAR PAROXETINA (sinal de malformação cardíaca no 1º trimestre).",
    "Fluoxetina: muitos dados, mas meia-vida longa e maior passagem para o leite.",
    "Síndrome de má adaptação neonatal (irritabilidade, taquipneia, tremor) ocorre em 10–30% dos expostos no 3º trimestre — é autolimitada (2–5 dias) e NÃO justifica suspender o antidepressivo antes do parto.",
    "HPPRN: risco absoluto muito baixo (~1–2:1.000 acima do basal)."]},
  {t:"Estabilizadores", itens:[
    "VALPROATO: CONTRAINDICADO em mulher em idade fértil sem contracepção eficaz — defeito de tubo neural (1–2%), queda de QI, autismo.",
    "CARBAMAZEPINA: teratogênica; além disso reduz a eficácia do anticoncepcional.",
    "LÍTIO: anomalia de Ebstein — risco relativo alto, absoluto baixo (~1:1.000). Manter se indispensável, com ecocardiograma fetal 16–20 semanas, litemia mais frequente (o clearance aumenta na gestação) e ajuste/suspensão no periparto pela variação volêmica.",
    "LAMOTRIGINA: melhor perfil do grupo; o nível cai muito na gestação — pode ser necessário aumentar e reajustar logo após o parto.",
    "Ácido fólico 5 mg/dia para toda mulher em idade fértil usando anticonvulsivante."]},
  {t:"Antipsicóticos e benzodiazepínicos", itens:[
    "Antipsicóticos: risperidona, quetiapina e olanzapina têm mais dados; vigiar diabetes gestacional e macrossomia (olanzapina).",
    "Benzodiazepínicos: evitar no 3º trimestre (floppy infant, abstinência neonatal); uso pontual é aceitável.",
    "Lactação: sertralina e paroxetina têm as menores concentrações no leite; evitar em prematuro/neonato instável; monitorar sedação e ganho de peso do lactente."]}],
 ref:"Sempre consultar fonte de lactação atualizada (LactMed) antes de decidir suspender a amamentação."},

{id:"idoso", nome:"Idoso", cor:"warn",
 blocos:[
  {t:"Regras de ouro", itens:[
    "Começar com metade da dose do adulto e titular na metade da velocidade — mas TITULAR ATÉ A DOSE EFICAZ. Subtratar idoso é tão erro quanto intoxicá-lo.",
    "Revisar TODA a prescrição: anticolinérgicos somados (oxibutinina + biperideno + ADT + hidroxizina) causam delirium.",
    "Antes de diagnosticar depressão: TSH, B12, hemograma, função renal, rever fármacos, rastrear apneia do sono."]},
  {t:"Evitar (critérios de Beers)", itens:[
    "Benzodiazepínicos: quedas, fratura, delirium, prejuízo cognitivo. Se já em uso crônico, desmame lento (10–25% a cada 1–2 semanas).",
    "Z-drugs (zolpidem): mesmos riscos dos benzodiazepínicos.",
    "Antidepressivos tricíclicos e anticolinérgicos (amitriptilina, imipramina).",
    "Antipsicóticos em demência: AUMENTAM MORTALIDADE (alerta de caixa-preta) — usar só se há risco, na menor dose e pelo menor tempo, com reavaliação documentada.",
    "Hidroxizina e demais anti-histamínicos de 1ª geração."]},
  {t:"Preferir", itens:[
    "Antidepressivo: sertralina, escitalopram (máx 10 mg), mirtazapina (se insônia/anorexia/baixo peso).",
    "Vigiar HIPONATREMIA nas primeiras 4 semanas de ISRS/IRSN.",
    "Antipsicótico, quando inevitável: quetiapina em dose baixa na doença de Parkinson/corpos de Lewy (jamais haloperidol ou risperidona nessas duas).",
    "Insônia: higiene do sono e TCC-I; melatonina; trazodona 25–50 mg."]}],
 ref:"American Geriatrics Society Beers Criteria (atualização periódica)."},

{id:"pediatria", nome:"Criança e adolescente", cor:"warn",
 blocos:[
  {t:"Princípios", itens:[
    "Diagnóstico exige informação de MÚLTIPLAS fontes: criança, cuidadores e escola.",
    "Psicoterapia e intervenção escolar/familiar vêm primeiro na maioria dos quadros leves a moderados.",
    "Toda prescrição pediátrica: mg/kg + peso usado + dose total + volume + teto máximo. Sinalizar sempre que a dose calculada ultrapassar a dose de adulto.",
    "Alerta de caixa-preta: antidepressivos aumentam ideação suicida em <25 anos — monitorização semanal nas primeiras 4 semanas, depois quinzenal. O risco de NÃO tratar a depressão é maior."]},
  {t:"Escolhas com melhor evidência", itens:[
    "Depressão em adolescente: FLUOXETINA (a de melhor evidência) e escitalopram; TCC associada (TADS, JAMA 2004).",
    "TOC pediátrico: sertralina, fluvoxamina, fluoxetina + EPR.",
    "TDAH: metilfenidato e lisdexanfetamina (efeito grande); monitorar peso, ESTATURA em curva, PA e FC.",
    "Irritabilidade grave no TEA: risperidona e aripiprazol (aprovados para essa indicação).",
    "Insônia: higiene do sono; melatonina 0,5–3 mg tem evidência em TEA/TDAH."]}],
 ref:"Sempre confirmar a dose pediátrica na calculadora abaixo antes de prescrever."},

{id:"renal-hepatico", nome:"Insuficiência renal e hepática", cor:"info",
 blocos:[
  {t:"Renal — ajustar ou evitar", itens:[
    "LÍTIO: excreção 100% renal — reduzir muito e monitorizar de perto; evitar se TFG<30.",
    "Paliperidona: ClCr 50–80 máx 6 mg · 10–50 máx 3 mg · <10 não usar.",
    "Amissulprida: ClCr 30–60 metade da dose; <30 evitar.",
    "Duloxetina: CONTRAINDICADA se ClCr<30.",
    "Pregabalina, gabapentina, topiramato, memantina, acamprosato: reduzir conforme clearance.",
    "Venlafaxina/desvenlafaxina: reduzir 25–50%.",
    "Mais seguros: sertralina, citalopram/escitalopram (com cautela), mirtazapina (com ajuste), olanzapina, quetiapina."]},
  {t:"Hepática — ajustar ou evitar", itens:[
    "EVITAR: duloxetina (etilista/hepatopata), agomelatina (contraindicada), valproato (contraindicado), nefazodona, clorpromazina.",
    "Benzodiazepínico de escolha: LORAZEPAM (glicuronidação direta, sem fase I).",
    "Reduzir 50%: sertralina, venlafaxina, mirtazapina, quetiapina (iniciar 25 mg), tricíclicos.",
    "Escitalopram: máx 10 mg. Paroxetina: iniciar 10 mg, máx 40 mg.",
    "Paliperidona e amissulprida são opções no hepatopata (excreção renal predominante).",
    "Encefalopatia hepática: todo sedativo piora — priorize tratar a causa."]}],
 ref:"Em diálise, muitos psicofármacos não são dialisáveis por alta ligação proteica — a exceção importante é o lítio."},

{id:"qt", nome:"Prolongamento de QTc", cor:"crit",
 blocos:[
  {t:"Limites e conduta", itens:[
    "QTc normal: <450 ms (homem) e <470 ms (mulher). QTc >500 ms ou aumento >60 ms do basal = risco de torsades — suspender ou trocar.",
    "Corrigir K+ (alvo >4,0) e Mg++ (alvo >2,0) antes de culpar o fármaco.",
    "Fazer ECG basal se: >65 anos, cardiopatia, bradicardia, distúrbio eletrolítico, hepatopatia, outro fármaco QT-prolongador, história familiar de morte súbita."]},
  {t:"Psicofármacos por risco de QT", itens:[
    "MAIOR: tioridazina, pimozida, ziprasidona, haloperidol IV, amissulprida, sultoprida, ADT em overdose.",
    "MODERADO: citalopram (>40 mg), escitalopram (>20 mg), quetiapina, olanzapina, risperidona, clorpromazina, levomepromazina, hidroxizina, donepezila, trazodona, metadona.",
    "MENOR: sertralina, fluoxetina, paroxetina, bupropiona, mirtazapina, aripiprazol, lurasidona, lamotrigina, lítio, valproato."]},
  {t:"Combinações frequentes no hospital que somam QT", itens:[
    "Antipsicótico + ondansetrona + fluconazol/azitromicina/quinolona/macrolídeo.",
    "Antipsicótico + metadona.",
    "Antipsicótico + antiarrítmico (amiodarona, sotalol).",
    "Qualquer um deles + hipocalemia por diurético ou vômito."]}],
 ref:"CredibleMeds mantém a lista de referência de fármacos que prolongam o QT."},

{id:"cyp", nome:"Interações por CYP450 — o que muda a conduta", cor:"info",
 blocos:[
  {t:"Inibidores potentes entre psicofármacos", itens:[
    "2D6: FLUOXETINA, PAROXETINA, BUPROPIONA — reduzem a ativação do tamoxifeno, da codeína e do tramadol (perda de analgesia) e elevam risperidona, aripiprazol, ADT, metoprolol, atomoxetina.",
    "1A2 e 2C19: FLUVOXAMINA — dobra clozapina, olanzapina, teofilina, melatonina, ramelteona.",
    "3A4 (não psiquiátricos): cetoconazol, itraconazol, claritromicina, ritonavir, suco de toranja — elevam quetiapina, midazolam, buspirona, lurasidona, trazodona."]},
  {t:"Indutores — derrubam o nível", itens:[
    "CARBAMAZEPINA, fenitoína, fenobarbital, rifampicina, erva-de-são-joão.",
    "Derrubam: anticoncepcional oral (risco real de falha), quetiapina, aripiprazol, clozapina, lamotrigina, varfarina, antirretrovirais.",
    "TABAGISMO induz 1A2: reduz olanzapina e clozapina em 30–50%. PARAR DE FUMAR (internação, cirurgia) pode DOBRAR o nível e intoxicar — ajustar dose na admissão hospitalar."]},
  {t:"Fora do CYP — não esqueça", itens:[
    "Lítio + AINE / IECA / BRA / tiazídico = intoxicação por lítio.",
    "Valproato + lamotrigina = dobra a lamotrigina (usar metade da titulação; risco de SJS).",
    "Serotoninérgico + tramadol / linezolida / azul de metileno = síndrome serotoninérgica.",
    "ISRS + AINE ou anticoagulante = risco de sangramento gastrointestinal (considerar IBP)."]}],
 ref:"Na dúvida sobre uma combinação específica, conferir em base de interações antes de prescrever."},

{id:"troca", nome:"Troca e retirada de antidepressivo", cor:"info",
 blocos:[
  {t:"Estratégias de troca", itens:[
    "CRUZADA (cross-taper) — padrão: reduzir o primeiro enquanto aumenta o segundo ao longo de 1–2 semanas. Vale para trocas entre ISRS, IRSN, mirtazapina, bupropiona.",
    "DIRETA: possível entre fármacos da mesma classe e potência semelhante (ex.: escitalopram → sertralina).",
    "COM WASHOUT: obrigatória quando envolve IMAO. Suspender o serotoninérgico e aguardar 2 semanas (5 SEMANAS se fluoxetina) antes de iniciar o IMAO; e 2 semanas após suspender o IMAO antes de qualquer serotoninérgico.",
    "Ao sair da fluoxetina para outro fármaco, lembrar que ela permanece inibindo o 2D6 por semanas — inicie o novo fármaco em dose menor."]},
  {t:"Síndrome de descontinuação", itens:[
    "FINISH: Flu-like (sintomas gripais), Insônia, Náusea, Imbalance (desequilíbrio/tontura), Sensory (parestesia, 'choques elétricos'), Hyperarousal (ansiedade, irritabilidade).",
    "Começa em 1–3 dias, dura 1–2 semanas. Pior com PAROXETINA e VENLAFAXINA; praticamente ausente com fluoxetina e vortioxetina.",
    "NÃO é recaída: recaída leva semanas e reproduz os sintomas originais; a descontinuação é precoce e tem sintomas físicos/sensoriais.",
    "Retirada: reduzir 25% a cada 2–4 semanas; desacelerar bastante nas últimas doses (a hipérbole de ocupação do transportador faz o final ser o mais difícil)."]},
  {t:"Depressão refratária — sequência", itens:[
    "Antes de chamar de refratária: confirme DOSE plena, TEMPO adequado (4–6 semanas em dose alvo), ADESÃO, DIAGNÓSTICO (bipolaridade? TUS? hipotireoidismo? apneia?) e comorbidade.",
    "Etapas com evidência: otimizar dose → trocar de classe → potencializar.",
    "Potencialização com melhor evidência: antipsicótico atípico (aripiprazol 2–5 mg, quetiapina 150–300 mg), LÍTIO (0,6–0,8 mEq/L), T3 25–50 mcg, bupropiona associada.",
    "Refratariedade estabelecida: esketamina intranasal ou ECT. A ECT segue sendo o tratamento mais eficaz na depressão grave, psicótica, catatônica ou com risco iminente de suicídio."]}],
 ref:"STAR*D (Am J Psychiatry 2006) — as taxas de remissão caem a cada etapa; por isso otimizar bem a 1ª linha importa mais que trocar rápido."},

{id:"metabolico", nome:"Monitorização metabólica e laboratorial", cor:"info",
 blocos:[
  {t:"Antes de iniciar", itens:[
    "ANTIPSICÓTICO: peso/IMC/circunferência abdominal, PA, glicemia de jejum (ou HbA1c), perfil lipídico, ECG conforme risco, prolactina se sintoma.",
    "LÍTIO: creatinina/TFG, TSH, cálcio, ECG (>40 anos), β-HCG.",
    "VALPROATO: hemograma, TGO/TGP, β-HCG.",
    "CARBAMAZEPINA: hemograma, Na+, TGO/TGP; HLA-B*1502 em ascendência asiática.",
    "CLOZAPINA: hemograma com neutrófilos, ECG, troponina e PCR basais.",
    "ISRS em idoso: Na+ basal."]},
  {t:"Seguimento", itens:[
    "Antipsicótico: peso a cada consulta nos 3 primeiros meses; glicemia e lipídeos em 12 semanas e depois anualmente.",
    "Lítio: litemia 5 dias após cada ajuste e a cada 3–6 meses; creatinina, TSH e cálcio a cada 6 meses.",
    "Valproato: nível sérico, hemograma e hepatograma a cada 3–6 meses.",
    "Clozapina: hemograma semanal × 18 semanas → quinzenal até 1 ano → mensal, indefinidamente.",
    "Agomelatina: TGO/TGP basal, 3, 6, 12 e 24 semanas e a cada aumento de dose.",
    "AIMS a cada 6 meses (3 meses se antipsicótico típico); Barnes quando houver queixa de inquietação."]}],
 ref:"Pacientes com transtorno mental grave morrem 15–20 anos mais cedo, predominantemente por doença cardiovascular — a monitorização metabólica é tratamento, não burocracia."},

{id:"sexual-peso", nome:"Disfunção sexual e ganho de peso", cor:"info",
 blocos:[
  {t:"Disfunção sexual por antidepressivo", itens:[
    "Frequência real de 40–60% com ISRS/IRSN — e é a principal causa silenciosa de abandono. Pergunte ativamente; o paciente não traz espontaneamente.",
    "Antes de atribuir ao fármaco: a própria depressão causa perda de libido.",
    "Estratégias: aguardar (tolerância é rara), reduzir a dose, trocar para BUPROPIONA, MIRTAZAPINA, AGOMELATINA ou VORTIOXETINA (menor incidência).",
    "Adjuvantes: bupropiona 150 mg associada; sildenafila/tadalafila para disfunção erétil (evidência também em mulheres, menos robusta)."]},
  {t:"Ganho de peso", itens:[
    "Maior risco: olanzapina e clozapina > quetiapina e risperidona > paliperidona > aripiprazol, ziprasidona, lurasidona.",
    "Antidepressivos: mirtazapina e paroxetina engordam; bupropiona é a única que tende a reduzir peso.",
    "Metformina tem evidência para prevenir/atenuar ganho de peso induzido por antipsicótico (iniciar 500 mg e titular).",
    "Topiramato como adjuvante tem evidência menor, com custo cognitivo.",
    "Intervenção em dieta e exercício estruturados funciona — encaminhe precocemente, não depois de 20 kg."]}],
 ref:"Trocar o antipsicótico por um de menor propensão metabólica é eficaz, mas o risco é recaída — decisão compartilhada."}
],

/* ============ DOSES PEDIÁTRICAS (mg/kg) ============ */
pediatria:[
 {n:"Sertralina", mgkg:"Iniciar 0,5 mg/kg/dia (ou 12,5–25 mg/dia)", faixa:"1–3 mg/kg/dia", teto:"200 mg/dia", conc:"cp 25/50 mg", obs:"≥6 anos no TOC. Titular a cada 1–2 semanas."},
 {n:"Fluoxetina", mgkg:"Iniciar 0,25 mg/kg/dia (ou 10 mg/dia)", faixa:"0,5–1 mg/kg/dia", teto:"60 mg/dia (20 mg em criança pequena)", conc:"sol oral 20 mg/mL", obs:"Melhor evidência na depressão do adolescente (TADS)."},
 {n:"Risperidona", mgkg:"Iniciar 0,25 mg/dia se <20 kg; 0,5 mg/dia se ≥20 kg", faixa:"0,5–3 mg/dia", teto:"3 mg/dia (irritabilidade no TEA)", conc:"sol oral 1 mg/mL", obs:"Vigiar prolactina, peso e SEP."},
 {n:"Aripiprazol", mgkg:"Iniciar 2 mg/dia", faixa:"5–15 mg/dia", teto:"15 mg/dia (TEA)", conc:"cp 10 mg", obs:"Menor impacto metabólico; vigiar acatisia."},
 {n:"Metilfenidato IR", mgkg:"Iniciar 0,3 mg/kg/dose", faixa:"0,3–1 mg/kg/dose, 2–3×/dia", teto:"2 mg/kg/dia ou 60 mg/dia", conc:"cp 10 mg", obs:"Monitorar peso, ESTATURA em curva, PA e FC."},
 {n:"Lisdexanfetamina", mgkg:"Iniciar 30 mg/dia (≥6 anos)", faixa:"30–70 mg/dia", teto:"70 mg/dia", conc:"cáps 30/50/70 mg", obs:"Dose por resposta, não por peso."},
 {n:"Melatonina", mgkg:"0,5–3 mg 30–60 min antes do horário-alvo", faixa:"0,5–5 mg", teto:"10 mg", conc:"variável (manipulado)", obs:"Horário importa mais que dose."},
 {n:"Haloperidol (agitação)", mgkg:"0,025–0,05 mg/kg/dose", faixa:"máx 2,5 mg/dose em criança pequena", teto:"0,15 mg/kg/dia", conc:"gotas 2 mg/mL · amp 5 mg/mL", obs:"Vigiar distonia aguda — biperideno à mão."},
 {n:"Midazolam (agitação)", mgkg:"0,1–0,15 mg/kg IM", faixa:"—", teto:"10 mg/dose", conc:"amp 5 mg/mL", obs:"Monitorização respiratória obrigatória."},
 {n:"Prometazina", mgkg:"0,5–1 mg/kg/dose IM", faixa:"—", teto:"50 mg/dose", conc:"amp 25 mg/mL", obs:"CONTRAINDICADA em <2 anos (depressão respiratória fatal)."},
 {n:"Biperideno (distonia)", mgkg:"0,04–0,1 mg/kg/dose IM/IV lento", faixa:"—", teto:"5 mg/dose", conc:"amp 5 mg/mL", obs:"Resposta em minutos."},
 {n:"Diazepam", mgkg:"0,1–0,3 mg/kg/dose", faixa:"—", teto:"10 mg/dose", conc:"cp 5/10 mg · amp 5 mg/mL", obs:"Risco de depressão respiratória."}
],

/* ============ RISCO DE SUICÍDIO ============ */
risco:{
 fatores:{
  estaticos:["Tentativa prévia — o preditor isolado mais forte","Sexo masculino (maior letalidade); sexo feminino tenta mais",
             "Idade >65 anos ou adolescente","História familiar de suicídio","Trauma/abuso na infância",
             "Doença psiquiátrica grave (depressão, TAB, esquizofrenia, TUS)","Doença clínica crônica, dolorosa ou terminal"],
  dinamicos:["Ideação com PLANO e INTENÇÃO","Acesso a meio letal (arma de fogo em casa, medicação acumulada, agrotóxico)",
             "Desesperança (preditor mais forte que a própria tristeza)","Insônia grave","Agitação, ansiedade intensa ou acatisia",
             "Uso agudo de álcool/substância","Perda recente: luto, separação, desemprego, humilhação pública, processo judicial",
             "Alta hospitalar recente (o período de maior risco é o primeiro mês pós-alta)","Isolamento social"],
  protecao:["Filhos menores em casa","Rede de apoio efetiva e disponível","Vínculo terapêutico ativo",
            "Crença religiosa contra o suicídio","Planos futuros concretos","Razões para viver explicitadas pelo próprio paciente"]},
 niveis:[
  {n:"BAIXO", cor:"ok", d:"Ideação passiva, sem plano, sem intenção, com crítica e suporte disponível.",
   c:["Plano de segurança por escrito, entregue ao paciente.","Restrição de meios com a família (sempre, em qualquer nível).",
      "Retorno em 1–2 semanas; contato telefônico intermediário.","Tratar agressivamente insônia e ansiedade.",
      "Fornecer contato do CVV 188 e do CAPS de referência."]},
  {n:"MODERADO", cor:"warn", d:"Ideação frequente, com algum método pensado, sem intenção firme; ambivalência; algum suporte.",
   c:["Plano de segurança formal com participação de familiar.","REMOÇÃO ativa dos meios letais — confirmar com terceiro, não apenas orientar.",
      "Retorno em ≤7 dias; considerar hospital-dia ou CAPS intensivo.","Prescrever em quantidade fracionada; evitar tricíclico.",
      "Reavaliar diagnóstico: é depressão bipolar? há TUS? há acatisia?"]},
  {n:"ALTO", cor:"crit", d:"Ideação com intenção e/ou plano, comportamento preparatório, tentativa recente, psicose com comando, desesperança intensa ou ausência de suporte.",
   c:["NÃO LIBERAR o paciente sozinho. Acompanhante obrigatório até a definição da conduta.",
      "INTERNAÇÃO — voluntária sempre que possível; involuntária se necessário (Lei 10.216/2001).",
      "Internação involuntária: solicitada por familiar/responsável ou indicada pelo médico, com comunicação ao Ministério Público em até 72 h.",
      "Remover meios; vigilância contínua; ambiente seguro.",
      "Tratar o quadro de base com urgência: ECT e esketamina têm efeito antissuicídio mais rápido.",
      "Documentar em prontuário: avaliação, fatores, decisão e justificativa."]}],
 plano:["1. Sinais de alerta que indicam que a crise está começando (do próprio paciente, nas palavras dele).",
        "2. Estratégias internas de enfrentamento que já funcionaram antes.",
        "3. Pessoas e lugares que distraem e acalmam.",
        "4. Pessoas a quem pedir ajuda — nome e telefone.",
        "5. Profissionais e serviços — nome, telefone, endereço. CVV 188 (24 h, gratuito). SAMU 192.",
        "6. Como tornar o ambiente seguro: o que será removido, por quem, quando e quem confirma."],
 ref:"Plano de segurança: Stanley B, Brown GK. Cogn Behav Pract. 2012;19(2):256-64. Contrato de não suicídio NÃO tem eficácia demonstrada e não protege legalmente — use plano de segurança."
},

/* ============ EXAME DO ESTADO MENTAL ============ */
eem:[
 {k:"aparencia", l:"Aparência e atitude", o:["cuidada, colaborativo","descuidada, higiene prejudicada","hipervigilante","desconfiado","hostil","apático, pouco cooperativo","sedado","bizarra"]},
 {k:"consciencia", l:"Nível de consciência", o:["vigil","sonolento","obnubilado","torporoso","flutuante"]},
 {k:"orientacao", l:"Orientação", o:["orientado em tempo e espaço","desorientado no tempo","desorientado no tempo e espaço","desorientado autopsiquicamente"]},
 {k:"atencao", l:"Atenção", o:["preservada","hipotenacidade","hipervigilância","distraibilidade acentuada","déficit de atenção sustentada"]},
 {k:"psicomotricidade", l:"Psicomotricidade", o:["normal","agitação psicomotora","lentificação psicomotora","inquietação/acatisia","estupor","catatonia","tremor","discinesia"]},
 {k:"humor", l:"Humor (relatado)", o:["eutímico","deprimido","elevado/eufórico","irritável","ansioso","disfórico","lábil","anedônico"]},
 {k:"afeto", l:"Afeto (observado)", o:["congruente e modulado","embotado","restrito","lábil","inapropriado","hiper-reativo"]},
 {k:"pensamento_curso", l:"Pensamento — curso", o:["normal","acelerado / taquipsiquismo","lentificado / bradipsiquismo","fuga de ideias","bloqueio","prolixo","circunstancial","tangencial","descarrilamento"]},
 {k:"pensamento_conteudo", l:"Pensamento — conteúdo", o:["sem alterações","ideação de menos-valia e culpa","ideação de ruína","ideação suicida","ideação homicida","ideias obsessivas","ideias supervalorizadas","delírio persecutório","delírio de grandeza","delírio de referência","delírio somático","delírio de ciúme"]},
 {k:"sensopercepcao", l:"Sensopercepção", o:["sem alterações","alucinação auditiva","alucinação visual","alucinação tátil","alucinação olfativa","alucinação cenestésica","ilusões","despersonalização","desrealização"]},
 {k:"linguagem", l:"Linguagem", o:["normal","taquilalia","bradilalia","hipofonia","mutismo","disartria","neologismo","ecolalia","salada de palavras"]},
 {k:"memoria", l:"Memória", o:["preservada","déficit de memória recente","déficit de memória remota","confabulação","amnésia lacunar"]},
 {k:"inteligencia", l:"Cognição global", o:["aparentemente preservada","déficit executivo","rebaixamento global aparente","não avaliável no momento"]},
 {k:"juizo", l:"Juízo de realidade", o:["preservado","comprometido","parcialmente comprometido"]},
 {k:"critica", l:"Crítica / insight", o:["preservada","parcial","ausente"]},
 {k:"pragmatismo", l:"Pragmatismo / volição", o:["preservado","reduzido","abolido","hipervolição"]}
]

};
