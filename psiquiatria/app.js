(()=>{
  'use strict';
  const D=window.PSYCH_DATA;
  const STORAGE_KEY='psychiatry-os-v2';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const blankState=()=>({
    version:2,patientId:'',patientAge:'',startedAt:null,answers:{},mse:{},scales:{},safety:{},
    diagnoses:[],ruleouts:[],formulation:{},primaryDiagnosis:'',differentials:'',medications:[],
    nonPharm:[],monitoring:[],planMonitoring:'',planGuidance:'',followUp:'',riskJudgment:'',riskDisposition:'',safetyPlan:'',
    currentQuestion:'q_reason',compare:[]
  });
  let state=loadState();
  let timerSeconds=0,timerHandle=null,deferredInstall=null,activeScale='phq9';

  function loadState(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));return saved&&saved.version===2?{...blankState(),...saved}:blankState()}catch{return blankState()}
  }
  function saveState(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    const el=$('#saveState');el.classList.add('saving');el.innerHTML='<i></i> Salvando…';
    clearTimeout(saveState._t);saveState._t=setTimeout(()=>{el.classList.remove('saving');el.innerHTML='<i></i> Salvo neste dispositivo'},500);
    refreshOverview();
  }
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),2200)}
  function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function domain(id){return D.domains.find(x=>x.id===id)||{label:id,color:'slate'}}
  function question(id){return D.questions.find(x=>x.id===id)}

  function init(){
    renderNavigation();renderQuestion();renderFullInterview();renderMse();renderScales();renderSafety();renderDiagnosis();renderDrugs();renderPlan();renderReferences();
    bindStaticEvents();hydrateSimpleFields();refreshOverview();registerPwa();registerWebMcp();
  }

  function renderNavigation(){
    const items=D.nav.map(([id,label,short],i)=>`<button data-page="${id}" class="${i===0?'active':''}"><span class="nav-index">${String(i+1).padStart(2,'0')}</span><span>${label}</span><i data-nav-status="${id}"></i></button>`).join('');
    $('#nav').innerHTML=items;
    $('#mobileNav').innerHTML=D.nav.slice(0,5).map(([id,,short],i)=>`<button data-page="${id}" class="${i===0?'active':''}"><span>${short}</span></button>`).join('');
  }
  function goPage(id){
    $$('.page').forEach(x=>x.classList.toggle('active',x.id===id));
    $$('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
    if(id==='evolucao')generateEvolution();
    window.scrollTo({top:0,behavior:'instant'});
  }

  function triggeredQuestionIds(){
    const active=new Set();
    D.questions.forEach(q=>{if(state.answers[q.id]?.status==='present'&&q.triggers)q.triggers.forEach(t=>active.add(t))});
    return new Set(D.questions.filter(q=>q.parent&&active.has(q.parent)).map(q=>q.id));
  }
  function adaptiveQueue(){
    const triggered=triggeredQuestionIds();
    const urgent=D.questions.filter(q=>triggered.has(q.id)&&q.critical&&!state.answers[q.id]?.status);
    const follow=D.questions.filter(q=>triggered.has(q.id)&&!q.critical&&!state.answers[q.id]?.status);
    const essentials=D.questions.filter(q=>q.essential&&!state.answers[q.id]?.status&&!urgent.some(u=>u.id===q.id));
    return [...urgent,...follow,...essentials];
  }
  function currentQuestion(){return question(state.currentQuestion)||adaptiveQueue()[0]||D.questions[0]}
  function renderQuestion(){
    const q=currentQuestion();state.currentQuestion=q.id;
    const d=domain(q.domain),answer=state.answers[q.id]||{};
    $('#questionDomain').textContent=d.label;$('#questionDomain').className=`tag ${d.color}`;
    $('#questionPriority').textContent=q.critical?'prioridade imediata':q.essential?'essencial':'aprofundamento';
    $('#questionPriority').classList.toggle('urgent',!!q.critical);
    $('#questionText').textContent=q.text;$('#questionHint').textContent=q.hint;
    const options=$('#responseOptions');
    if(q.answerMode==='narrative'){
      options.innerHTML='<button data-answer="present" class="single-answer">Conteúdo registrado</button>';
    }else{
      options.innerHTML='<button data-answer="present">Presente</button><button data-answer="absent">Ausente</button><button data-answer="unknown">Não explorado</button>';
    }
    $$('[data-answer]',options).forEach(b=>b.classList.toggle('selected',b.dataset.answer===answer.status));
    $('#questionNote').value=answer.note||'';
    renderQueue();
  }
  function renderQueue(){
    const queue=adaptiveQueue().filter(q=>q.id!==state.currentQuestion).slice(0,5);
    $('#questionQueue').innerHTML=queue.length?queue.map((q,i)=>`<button data-qid="${q.id}" class="queue-item ${q.critical?'urgent':''}"><span>${i+1}</span><div><small>${domain(q.domain).label}</small><b>${escapeHtml(q.text)}</b></div><i>→</i></button>`).join(''):'<div class="queue-complete"><span>✓</span><div><b>Eixos essenciais cobertos</b><p>Revise o exame mental, segurança, hipótese e plano.</p></div></div>';
  }
  function setAnswer(status){
    const q=currentQuestion();state.answers[q.id]={status,note:$('#questionNote').value.trim(),updatedAt:new Date().toISOString()};
    saveState();renderQuestion();
  }
  function saveAndNext(){
    const q=currentQuestion(),existing=state.answers[q.id]||{};
    let status=existing.status;
    if(q.answerMode==='narrative'&&!status)status=$('#questionNote').value.trim()?'present':'unknown';
    if(!status){toast('Marque a resposta clínica antes de continuar.');return}
    state.answers[q.id]={status,note:$('#questionNote').value.trim(),updatedAt:new Date().toISOString()};
    const next=adaptiveQueue().find(item=>item.id!==q.id);
    state.currentQuestion=next?.id||q.id;saveState();renderQuestion();
    if(next?.critical)toast('A fila priorizou uma pergunta de segurança.');
  }
  function previousQuestion(){
    const answered=D.questions.filter(q=>state.answers[q.id]?.updatedAt).sort((a,b)=>state.answers[b.id].updatedAt.localeCompare(state.answers[a.id].updatedAt));
    const prev=answered.find(q=>q.id!==state.currentQuestion);if(prev){state.currentQuestion=prev.id;renderQuestion()}
  }

  function renderFullInterview(){
    $('#fullInterview').innerHTML=D.interviewGroups.map((group,index)=>`<details ${index===0?'open':''}><summary><div><span>${String(index+1).padStart(2,'0')}</span><b>${group.title}</b></div><i>+</i></summary><div class="details-body">${group.ids.map(id=>{
      const q=question(id),a=state.answers[id]||{};return `<article class="interview-row" data-interview="${id}"><div><span class="tag ${domain(q.domain).color}">${domain(q.domain).label}</span><p>${q.text}</p><small>${q.hint}</small></div><select aria-label="Status da resposta"><option value="">Não explorado</option><option value="present" ${a.status==='present'?'selected':''}>Presente / registrado</option><option value="absent" ${a.status==='absent'?'selected':''}>Ausente</option><option value="unknown" ${a.status==='unknown'?'selected':''}>Inconclusivo</option></select><textarea rows="3" placeholder="Nota clínica...">${escapeHtml(a.note||'')}</textarea></article>`}).join('')}</div></details>`).join('');
  }

  function renderMse(){
    $('#mseGrid').innerHTML=D.mse.map(item=>{const v=state.mse[item.id]||{};return `<article class="mse-card" data-mse="${item.id}"><label>${item.label}<select>${item.options.map(o=>`<option ${v.value===o?'selected':''}>${o}</option>`).join('')}</select></label><textarea rows="2" placeholder="Complemento opcional...">${escapeHtml(v.note||'')}</textarea></article>`}).join('');
  }
  function applyNormalMse(){D.mse.forEach(item=>state.mse[item.id]={value:item.normal,note:''});saveState();renderMse();toast('Exame sem alterações preenchido — revise antes de usar.')}

  function renderScales(){
    $('#scaleTabs').innerHTML=D.scales.map(s=>`<button data-scale="${s.id}" class="${activeScale===s.id?'active':''}">${s.name}<span>${scaleTotal(s.id)}</span></button>`).join('');
    const s=D.scales.find(x=>x.id===activeScale),values=state.scales[s.id]||Array(s.items.length).fill(null),total=values.reduce((a,v)=>a+(Number(v)||0),0);
    $('#scaleWorkspace').innerHTML=`<article class="scale-sheet"><div class="scale-header"><div><p class="eyebrow">${s.name}</p><h2>${s.purpose}</h2></div><div class="score-orb"><b>${total}</b><span>${s.interpret(total)}</span></div></div><div class="scale-legend">${s.labels.map((l,i)=>`<span><b>${s.range[i]}</b>${l}</span>`).join('')}</div><div class="scale-items">${s.items.map((item,i)=>`<div class="scale-item"><div><span>${i+1}</span><p>${item}</p>${s.alertIndex===i?'<small>Qualquer resposta acima de zero exige avaliação clínica de segurança.</small>':''}</div><div class="scale-options">${s.range.map(v=>`<label><input type="radio" name="${s.id}-${i}" value="${v}" data-scale-item="${i}" ${Number(values[i])===v?'checked':''}><span>${v}</span></label>`).join('')}</div></div>`).join('')}</div><p class="scale-footnote">Interprete junto com prejuízo funcional, contexto, diagnóstico diferencial e avaliação clínica.</p></article>`;
  }
  function scaleTotal(id){return (state.scales[id]||[]).reduce((a,v)=>a+(Number(v)||0),0)}

  function renderSafety(){
    $('#safetySteps').innerHTML=D.safetySteps.map((step,si)=>`<details open><summary><span>${step.title}</span><i>${step.items.filter((_,ii)=>state.safety[`${si}-${ii}`]).length}/${step.items.length}</i></summary><div class="safety-checks">${step.items.map((item,ii)=>`<label><input type="checkbox" data-safety="${si}-${ii}" ${state.safety[`${si}-${ii}`]?'checked':''}><span>${item}</span></label>`).join('')}</div></details>`).join('');
    updateRiskSummary();
  }
  function updateRiskSummary(){
    const checked=Object.keys(state.safety).filter(k=>state.safety[k]);
    const investigation=checked.filter(k=>k.startsWith('2-')).length,urgent=checked.filter(k=>k.startsWith('3-')).length;
    const highMarkers=['2-2','2-3','2-4','2-5','3-0','3-1','3-2','3-3','3-4'].some(k=>state.safety[k]);
    let badge='Pendente',level='Sem estratificação',rationale='Conclua a investigação e registre seu julgamento clínico. A soma de itens não substitui a formulação de risco.',tone='pending';
    if(checked.length&&!highMarkers){badge='Revisar';level='Sinais registrados',rationale='Há fatores assinalados. Integre temporalidade, gravidade, fatores protetores, suporte e capacidade de colaboração.',tone='attention'}
    if(highMarkers){badge='Ação';level='Preocupação elevada',rationale='Há marcador de maior preocupação aguda. Priorize supervisão, restrição segura de meios e avaliação de urgência conforme julgamento clínico.',tone='danger'}
    $('#riskBadge').textContent=badge;$('#riskLevel').textContent=level;$('#riskRationale').textContent=rationale;
    $('.risk-meter').className=`risk-meter ${tone}`;
    $('#emergencyBanner').classList.toggle('critical',highMarkers);
    return {checked:checked.length,investigation,urgent,highMarkers,badge,level};
  }

  function renderDiagnosis(){
    $('#diagnosticChips').innerHTML=D.diagnoses.map(item=>`<button class="chip ${state.diagnoses.includes(item)?'on':''}" data-diagnosis="${item}">${item}</button>`).join('');
    $('#ruleoutList').innerHTML=D.ruleouts.map(item=>`<label><input type="checkbox" data-ruleout="${item}" ${state.ruleouts.includes(item)?'checked':''}><span>${item}</span></label>`).join('');
    $('#formulationGrid').innerHTML=D.formulation.map(item=>`<label>${item}<textarea rows="3" data-formulation="${item}">${escapeHtml(state.formulation[item]||'')}</textarea></label>`).join('');
  }

  function renderDrugs(){
    const classes=[...new Set(D.drugs.map(d=>d.class))];
    if(!$('#drugClass').dataset.ready){$('#drugClass').innerHTML='<option value="">Todas as classes</option>'+classes.map(c=>`<option>${c}</option>`).join('');$('#drugClass').dataset.ready='1'}
    const query=$('#drugSearch').value.toLowerCase().trim(),klass=$('#drugClass').value;
    const filtered=D.drugs.filter(d=>(!klass||d.class===klass)&&(!query||Object.values(d).join(' ').toLowerCase().includes(query)));
    $('#drugGrid').innerHTML=filtered.map(d=>`<article class="drug-card"><div class="drug-card-top"><span>${d.class}</span><label class="compare-check"><input type="checkbox" data-compare="${d.id}" ${state.compare.includes(d.id)?'checked':''}><i></i> comparar</label></div><h2>${d.name}</h2><p>${d.uses}</p><dl><div><dt>Início de referência</dt><dd>${d.start}</dd></div><div><dt>Faixa usual</dt><dd>${d.range}</dd></div></dl><div class="drug-actions"><button class="quiet" data-drug="${d.id}">Ver detalhes</button><button class="primary small" data-add-drug="${d.id}">Adicionar ao plano</button></div></article>`).join('');
    $('#compareCount').textContent=state.compare.length;
  }
  function openDrug(id){
    const d=D.drugs.find(x=>x.id===id);if(!d)return;
    $('#drugDetails').innerHTML=`<div class="drug-detail-head"><span>${d.class}</span><h1>${d.name}</h1><p>${d.uses}</p></div><div class="drug-detail-grid"><article><small>INÍCIO DE REFERÊNCIA</small><b>${d.start}</b></article><article><small>FAIXA USUAL</small><b>${d.range}</b></article><article><small>ADMINISTRAÇÃO</small><b>${d.timing}</b></article></div><div class="detail-columns"><section><h3>Antes de iniciar</h3><ul>${d.baseline.map(x=>`<li>${x}</li>`).join('')}</ul><h3>Monitorar</h3><ul>${d.monitor.map(x=>`<li>${x}</li>`).join('')}</ul></section><section><h3>Cautelas</h3><p>${d.cautions}</p><h3>Interações relevantes</h3><p>${d.interactions}</p><div class="clinical-pearl"><b>Ponto clínico</b><p>${d.pearl}</p></div></section></div><div class="dialog-actions"><button class="ghost" data-close-dialog>Fechar</button><button class="primary" data-dialog-add="${d.id}">Adicionar ao plano</button></div>`;
    $('#drugDialog').showModal();
  }
  function openComparison(){
    const selected=D.drugs.filter(d=>state.compare.includes(d.id));
    if(selected.length<2){toast('Selecione de 2 a 3 medicamentos para comparar.');return}
    $('#comparisonTable').innerHTML=`<div class="comparison-head"><p class="eyebrow">COMPARAÇÃO LADO A LADO</p><h1>${selected.map(d=>d.name).join(' × ')}</h1></div><div class="comparison-grid" style="--cols:${selected.length}">${selected.map(d=>`<article><span>${d.class}</span><h2>${d.name}</h2><h3>Indicações</h3><p>${d.uses}</p><h3>Início / faixa</h3><p>${d.start}<br>${d.range}</p><h3>Antes de iniciar</h3><ul>${d.baseline.map(x=>`<li>${x}</li>`).join('')}</ul><h3>Monitorar</h3><ul>${d.monitor.map(x=>`<li>${x}</li>`).join('')}</ul><h3>Cautelas</h3><p>${d.cautions}</p><button class="primary" data-dialog-add="${d.id}">Adicionar ${d.name}</button></article>`).join('')}</div>`;
    $('#compareDialog').showModal();
  }
  function addDrug(id){
    const d=D.drugs.find(x=>x.id===id);if(!d)return;
    if(!state.medications.some(m=>m.drugId===id))state.medications.push({id:crypto.randomUUID?.()||String(Date.now()),drugId:id,dose:'',frequency:'',titration:'',rationale:''});
    d.baseline.concat(d.monitor).forEach(term=>{const match=D.monitoring.find(m=>m.toLowerCase().split('/')[0].includes(term.toLowerCase().split('/')[0]));if(match&&!state.monitoring.includes(match))state.monitoring.push(match)});
    saveState();renderPlan();$$('dialog[open]').forEach(dlg=>dlg.close());toast(`${d.name} adicionado ao plano.`);
  }

  function renderPlan(){
    $('#medicationPlan').innerHTML=state.medications.length?state.medications.map((m,index)=>{const d=D.drugs.find(x=>x.id===m.drugId);return `<article data-med-row="${m.id}"><div class="med-number">${index+1}</div><div class="med-fields"><div class="med-name"><b>${d?.name||'Medicamento'}</b><small>${d?.class||''}</small></div><label>Dose<input data-med-field="dose" value="${escapeHtml(m.dose)}" placeholder="Ex.: 25 mg"></label><label>Frequência<input data-med-field="frequency" value="${escapeHtml(m.frequency)}" placeholder="Ex.: pela manhã"></label><label>Titulação / duração<input data-med-field="titration" value="${escapeHtml(m.titration)}" placeholder="Plano de ajuste"></label><label>Alvo / justificativa<input data-med-field="rationale" value="${escapeHtml(m.rationale)}" placeholder="Sintoma-alvo"></label></div><button class="remove-med" data-remove-med="${m.id}" aria-label="Remover">×</button></article>`}).join(''):'<div class="empty-state"><span>Rx</span><b>Nenhum medicamento no plano</b><p>Adicione pela biblioteca ou crie uma linha livre.</p></div>';
    $('#nonPharmList').innerHTML=D.nonPharm.map(item=>`<label><input type="checkbox" data-nonpharm="${item}" ${state.nonPharm.includes(item)?'checked':''}><span>${item}</span></label>`).join('');
    $('#monitoringList').innerHTML=D.monitoring.map(item=>`<label><input type="checkbox" data-monitoring="${item}" ${state.monitoring.includes(item)?'checked':''}><span>${item}</span></label>`).join('');
  }

  function renderReferences(){
    $('#referenceGrid').innerHTML=D.references.map((r,i)=>`<a href="${r.url}" target="_blank" rel="noopener"><span>${String(i+1).padStart(2,'0')}</span><div><h2>${r.title}</h2><p>${r.desc}</p></div><i>↗</i></a>`).join('')+`<article class="limits-card"><p class="eyebrow">LIMITES DO SISTEMA</p><h2>Apoio, não piloto automático</h2><p>Escalas não fecham diagnóstico; regras de fila não estimam probabilidade; doses são referências, não prescrição pronta. Sempre revise bula vigente, comorbidades, interações, função renal/hepática, contexto reprodutivo e protocolo local.</p><p>Atualização clínica da V2: setembro de 2026.</p></article>`;
  }

  function hydrateSimpleFields(){
    $('#patientId').value=state.patientId;$('#patientAge').value=state.patientAge;
    $('#primaryDiagnosis').value=state.primaryDiagnosis;$('#differentials').value=state.differentials;
    $('#planMonitoring').value=state.planMonitoring;$('#planGuidance').value=state.planGuidance;$('#followUp').value=state.followUp;
    $('#riskJudgment').value=state.riskJudgment;$('#riskDisposition').value=state.riskDisposition;$('#safetyPlan').value=state.safetyPlan;
  }

  function refreshOverview(){
    const essentials=D.questions.filter(q=>q.essential),answered=essentials.filter(q=>state.answers[q.id]?.status),pct=Math.round(answered.length/essentials.length*100);
    $('#progressText').textContent=`${answered.length} de ${essentials.length} eixos essenciais`;$('#completionPct').textContent=`${pct}%`;$('#completionBar').style.width=`${pct}%`;
    $('#coverage').innerHTML=D.domains.map(d=>{const qs=D.questions.filter(q=>q.domain===d.id&&q.essential),done=qs.filter(q=>state.answers[q.id]?.status).length;if(!qs.length)return'';return `<div><span>${d.label}</span><i class="${done===qs.length?'done':done?'partial':''}"></i></div>`}).join('');
    const signals=D.questions.filter(q=>state.answers[q.id]?.status==='present'&&q.signal).map(q=>q.signal);
    const phq=state.scales.phq9||[];if(Number(phq[8])>0&&!signals.includes('PHQ-9 item 9 positivo'))signals.unshift('PHQ-9 item 9 positivo');
    $('#activeSignals').innerHTML=signals.length?signals.slice(0,8).map(s=>`<span>${s}</span>`).join(''):'<span class="empty-inline">Nenhum sinal clínico registrado.</span>';
    const safetySignals=['q_suicide','q_suicide_plan','q_suicide_intent','q_suicide_means','q_suicide_attempt','q_psychosis_command','q_delirium'].filter(id=>state.answers[id]?.status==='present');
    const risk=updateRiskSummary();
    if(safetySignals.length||risk.highMarkers){$('#safetyStatus').className='status-card safety-status alert';$('#safetyLabel').textContent='Requer síntese clínica';$('#safetySummary').textContent=`${safetySignals.length+risk.urgent} marcador(es) de preocupação registrado(s).`}
    else if(state.answers.q_suicide?.status||risk.checked){$('#safetyStatus').className='status-card safety-status assessed';$('#safetyLabel').textContent='Avaliação iniciada';$('#safetySummary').textContent='Revise fatores, julgamento, disposição e plano de segurança.'}
    else{$('#safetyStatus').className='status-card safety-status';$('#safetyLabel').textContent='Ainda não avaliada';$('#safetySummary').textContent='Ideação suicida, violência, psicose, mania, substâncias e delirium.'}
    $('[data-nav-status="consulta"]').className=pct===100?'done':pct?'partial':'';
    $('[data-nav-status="seguranca"]').className=safetySignals.length||risk.highMarkers?'alert':state.answers.q_suicide?.status?'done':'';
    $('[data-nav-status="eem"]').className=Object.keys(state.mse).length===D.mse.length?'done':Object.keys(state.mse).length?'partial':'';
    $('[data-nav-status="diagnostico"]').className=state.primaryDiagnosis?'done':'';
    $('[data-nav-status="plano"]').className=state.medications.length||state.nonPharm.length?'partial':'';
    renderQueue();
  }

  function generateEvolution(){
    const answerNotes=D.questions.map(q=>{const a=state.answers[q.id];return a?.note?`${domain(q.domain).label}: ${a.note}`:null}).filter(Boolean);
    const negative=D.questions.filter(q=>state.answers[q.id]?.status==='absent').map(q=>q.signal||q.text.replace('?','').toLowerCase());
    const mse=D.mse.map(item=>{const value=state.mse[item.id];return value?.value?`${item.label}: ${value.value}${value.note?` (${value.note})`:''}`:null}).filter(Boolean);
    const scaleText=D.scales.filter(s=>state.scales[s.id]?.some(v=>v!==null&&v!==undefined)).map(s=>{const total=scaleTotal(s.id);return `${s.name}: ${total} (${s.interpret(total)})`});
    const presentSafety=D.questions.filter(q=>q.domain==='seguranca'&&state.answers[q.id]?.status==='present').map(q=>q.signal||q.text);
    const checkedSafety=[];D.safetySteps.forEach((s,si)=>s.items.forEach((item,ii)=>{if(state.safety[`${si}-${ii}`])checkedSafety.push(item)}));
    const meds=state.medications.map(m=>{const d=D.drugs.find(x=>x.id===m.drugId);return `${d?.name||'Medicamento'} ${m.dose||'[dose]'} ${m.frequency||''}${m.titration?`; ${m.titration}`:''}${m.rationale?` — alvo: ${m.rationale}`:''}`.trim()});
    const missing=[];
    if(!state.answers.q_reason?.note)missing.push('Queixa principal e narrativa inicial');
    if(!state.answers.q_onset?.note)missing.push('Cronologia e curso');
    if(!state.answers.q_suicide?.status)missing.push('Investigação explícita de ideação suicida');
    if(Object.keys(state.mse).length<D.mse.length)missing.push('Exame do estado mental completo');
    if(!state.primaryDiagnosis)missing.push('Hipótese diagnóstica principal');
    if(!state.riskJudgment&&(presentSafety.length||checkedSafety.length))missing.push('Julgamento clínico de risco e justificativa');
    if(!state.followUp)missing.push('Prazo de retorno e contingência');
    $('#missingData').innerHTML=missing.length?missing.map(x=>`<button data-missing="${escapeHtml(x)}"><span>!</span>${x}</button>`).join(''):'<div class="ready-state"><span>✓</span><b>Itens essenciais preenchidos</b><p>Faça a revisão clínica final antes de copiar.</p></div>';
    const out=`EVOLUÇÃO PSIQUIÁTRICA

IDENTIFICAÇÃO:
${state.patientId?`Identificador: ${state.patientId}. `:''}${state.patientAge?`Idade: ${state.patientAge} anos.`:'[completar se pertinente]'}

QUEIXA PRINCIPAL E HISTÓRIA ATUAL:
${answerNotes.length?answerNotes.join(' '):'[completar história e cronologia]'}
${negative.length?`Negados/ausentes na avaliação: ${negative.join('; ')}.`:''}

ANTECEDENTES PSIQUIÁTRICOS, CLÍNICOS E TERAPÊUTICOS:
${state.answers.q_history?.note||'[completar antecedentes psiquiátricos, internações, tentativas e tratamentos prévios]'}
${state.answers.q_medical?.note||'[completar comorbidades, medicamentos, alergias e contexto reprodutivo]'}
${state.answers.q_substance?.note?`Substâncias: ${state.answers.q_substance.note}`:'Substâncias: [completar]'}

EXAME DO ESTADO MENTAL:
${mse.length?mse.join('; ')+'.':'[completar]'}

ESCALAS / MEDIDAS:
${scaleText.length?scaleText.join('; ')+'.':'Não registradas.'}

AVALIAÇÃO DE SEGURANÇA:
${presentSafety.length?`Marcadores presentes: ${presentSafety.join('; ')}. `:'Nenhum marcador positivo documentado no roteiro adaptativo. '}${checkedSafety.length?`Itens assinalados: ${checkedSafety.join('; ')}. `:''}
Julgamento clínico: ${state.riskJudgment||'[completar — não inferir risco apenas por pontuação]'}
Disposição: ${state.riskDisposition||'[completar]'}
Plano de segurança: ${state.safetyPlan||'[registrar quando indicado]'}

FORMULAÇÃO / HIPÓTESES:
Hipótese principal: ${state.primaryDiagnosis||'[completar]'}.
Famílias consideradas: ${state.diagnoses.join(', ')||'[completar]'}.
Diferenciais: ${state.differentials||'[completar]'}.
${D.formulation.map(k=>state.formulation[k]?`${k}: ${state.formulation[k]}`:null).filter(Boolean).join('\n')}

PLANO:
${meds.length?`Farmacológico:\n- ${meds.join('\n- ')}`:'Farmacológico: [completar ou registrar não indicado]'}
${state.nonPharm.length?`Não farmacológico:\n- ${state.nonPharm.join('\n- ')}`:''}
${state.monitoring.length||state.planMonitoring?`Monitorização/exames:\n- ${state.monitoring.concat(state.planMonitoring?[state.planMonitoring]:[]).join('\n- ')}`:''}
${state.planGuidance?`Orientações: ${state.planGuidance}`:'Orientações: [completar sinais de alarme, adesão, efeitos adversos e acesso em piora].'}
Retorno/contingência: ${state.followUp||'[completar]'}

Observação: revisar indicação, doses, contraindicações, interações, função renal/hepática, contexto reprodutivo e monitorização antes de finalizar a prescrição.`;
    $('#evolutionOutput').value=out;
    return {text:out,missing};
  }

  function bindStaticEvents(){
    document.addEventListener('click',e=>{
      const page=e.target.closest('[data-page],[data-go]')?.dataset.page||e.target.closest('[data-go]')?.dataset.go;if(page){goPage(page);return}
      const answer=e.target.closest('[data-answer]');if(answer){setAnswer(answer.dataset.answer);return}
      const q=e.target.closest('[data-qid]');if(q){state.currentQuestion=q.dataset.qid;renderQuestion();return}
      const chip=e.target.closest('[data-diagnosis]');if(chip){const v=chip.dataset.diagnosis;state.diagnoses=state.diagnoses.includes(v)?state.diagnoses.filter(x=>x!==v):[...state.diagnoses,v];saveState();renderDiagnosis();return}
      const drug=e.target.closest('[data-drug]');if(drug){openDrug(drug.dataset.drug);return}
      const add=e.target.closest('[data-add-drug],[data-dialog-add]');if(add){addDrug(add.dataset.addDrug||add.dataset.dialogAdd);return}
      const remove=e.target.closest('[data-remove-med]');if(remove){state.medications=state.medications.filter(m=>m.id!==remove.dataset.removeMed);saveState();renderPlan();return}
      const close=e.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return}
    });
    $('#responseOptions').addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(b)setAnswer(b.dataset.answer)});
    $('#nextQuestion').onclick=saveAndNext;$('#previousQuestion').onclick=previousQuestion;
    $('#showAllQuestions').onclick=()=>goPage('roteiro');
    $('#questionNote').addEventListener('input',()=>{const q=currentQuestion();state.answers[q.id]={...(state.answers[q.id]||{}),note:$('#questionNote').value};saveState()});
    $('#fullInterview').addEventListener('input',e=>{const row=e.target.closest('[data-interview]');if(!row)return;const id=row.dataset.interview;state.answers[id]={status:$('select',row).value||'unknown',note:$('textarea',row).value,updatedAt:new Date().toISOString()};saveState()});
    $('#mseGrid').addEventListener('input',e=>{const card=e.target.closest('[data-mse]');if(!card)return;state.mse[card.dataset.mse]={value:$('select',card).value,note:$('textarea',card).value};saveState()});
    $('#applyNormalMse').onclick=applyNormalMse;
    $('#scaleTabs').onclick=e=>{const b=e.target.closest('[data-scale]');if(b){activeScale=b.dataset.scale;renderScales()}};
    $('#scaleWorkspace').addEventListener('change',e=>{if(!e.target.dataset.scaleItem)return;const s=D.scales.find(x=>x.id===activeScale),values=state.scales[s.id]||Array(s.items.length).fill(null);values[Number(e.target.dataset.scaleItem)]=Number(e.target.value);state.scales[s.id]=values;if(s.id==='phq9'&&Number(values[8])>0&&!state.answers.q_suicide?.status){state.currentQuestion='q_suicide';toast('Item 9 positivo: avaliação de segurança priorizada.')}saveState();renderScales()});
    $('#safetySteps').addEventListener('change',e=>{if(!e.target.dataset.safety)return;state.safety[e.target.dataset.safety]=e.target.checked;saveState();updateRiskSummary()});
    $('#clearSafety').onclick=()=>{state.safety={};state.riskJudgment='';state.riskDisposition='';state.safetyPlan='';saveState();renderSafety();hydrateSimpleFields()};
    $('#ruleoutList').addEventListener('change',e=>{if(!e.target.dataset.ruleout)return;const v=e.target.dataset.ruleout;state.ruleouts=e.target.checked?[...new Set([...state.ruleouts,v])]:state.ruleouts.filter(x=>x!==v);saveState()});
    $('#formulationGrid').addEventListener('input',e=>{if(e.target.dataset.formulation){state.formulation[e.target.dataset.formulation]=e.target.value;saveState()}});
    $('#drugSearch').oninput=renderDrugs;$('#drugClass').onchange=renderDrugs;
    $('#drugGrid').addEventListener('change',e=>{if(!e.target.dataset.compare)return;const id=e.target.dataset.compare;if(e.target.checked&&state.compare.length>=3){e.target.checked=false;toast('Compare no máximo três medicamentos.');return}state.compare=e.target.checked?[...state.compare,id]:state.compare.filter(x=>x!==id);saveState();renderDrugs()});
    $('#openComparison').onclick=openComparison;
    $('#addMedication').onclick=()=>{const id=`free-${Date.now()}`;D.drugs.push({id,name:'Medicamento livre',class:'Outro',baseline:[],monitor:[]});state.medications.push({id:crypto.randomUUID?.()||id,drugId:id,dose:'',frequency:'',titration:'',rationale:''});saveState();renderPlan()};
    $('#medicationPlan').addEventListener('input',e=>{const row=e.target.closest('[data-med-row]');if(!row||!e.target.dataset.medField)return;const m=state.medications.find(x=>x.id===row.dataset.medRow);if(m){m[e.target.dataset.medField]=e.target.value;saveState()}});
    $('#nonPharmList').addEventListener('change',e=>toggleArray('nonPharm',e.target.dataset.nonpharm,e.target.checked));
    $('#monitoringList').addEventListener('change',e=>toggleArray('monitoring',e.target.dataset.monitoring,e.target.checked));
    ['patientId','patientAge','primaryDiagnosis','differentials','planMonitoring','planGuidance','followUp','riskJudgment','riskDisposition','safetyPlan'].forEach(id=>$('#'+id).addEventListener('input',e=>{state[id]=e.target.value;saveState()}));
    $('#generateEvolution').onclick=()=>{generateEvolution();toast('Evolução atualizada.')};
    $('#copyEvolution').onclick=async()=>{generateEvolution();try{await navigator.clipboard.writeText($('#evolutionOutput').value);toast('Evolução copiada.')}catch{toast('Selecione o texto para copiar.')}};
    $('#printEvolution').onclick=()=>window.print();
    $('#newConsult').onclick=()=>$('#confirmDialog').showModal();
    $('#confirmDialog').addEventListener('close',()=>{if($('#confirmDialog').returnValue==='confirm'){localStorage.removeItem(STORAGE_KEY);location.reload()}});
    $('#exportData').onclick=exportData;
    $('#timerBtn').onclick=toggleTimer;
    document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&$('#consulta').classList.contains('active')){e.preventDefault();saveAndNext()}});
  }
  function toggleArray(key,value,checked){if(!value)return;state[key]=checked?[...new Set([...state[key],value])]:state[key].filter(x=>x!==value);saveState()}
  function toggleTimer(){
    if(timerHandle){clearInterval(timerHandle);timerHandle=null;$('#timerBtn').textContent='Retomar'}
    else{if(!state.startedAt)state.startedAt=new Date().toISOString();timerHandle=setInterval(()=>{timerSeconds++;$('#clock').textContent=`${String(Math.floor(timerSeconds/60)).padStart(2,'0')}:${String(timerSeconds%60).padStart(2,'0')}`},1000);$('#timerBtn').textContent='Pausar';saveState()}
  }
  function exportData(){
    const safe={...state,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`psychiatry-os-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Consulta exportada em JSON.')
  }
  function registerPwa(){
    if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('#installApp').classList.remove('install-hidden')});
    $('#installApp').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('#installApp').classList.add('install-hidden')};
  }
  function registerWebMcp(){
    const context=document.modelContext;if(!context?.registerTool)return;
    const register=tool=>{try{Promise.resolve(context.registerTool(tool)).catch(()=>{})}catch{}}
    register({name:'get_consultation_summary',title:'Resumo da consulta',description:'Lê o progresso, sinais ativos e pendências da consulta psiquiátrica aberta.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{const generated=generateEvolution();return{essentialAnswered:D.questions.filter(q=>q.essential&&state.answers[q.id]?.status).length,essentialTotal:D.questions.filter(q=>q.essential).length,activeSignals:D.questions.filter(q=>state.answers[q.id]?.status==='present'&&q.signal).map(q=>q.signal),missing:generated.missing}}});
    register({name:'set_clinical_answer',title:'Registrar resposta clínica',description:'Registra uma resposta no roteiro visível usando um ID de pergunta válido.',inputSchema:{type:'object',properties:{questionId:{type:'string'},status:{type:'string',enum:['present','absent','unknown']},note:{type:'string'}},required:['questionId','status'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const q=question(input.questionId);if(!q)throw new Error('questionId inválido');state.answers[q.id]={status:input.status,note:String(input.note||''),updatedAt:new Date().toISOString()};saveState();renderQuestion();renderFullInterview();return{questionId:q.id,saved:true}}});
    register({name:'generate_clinical_note',title:'Gerar evolução',description:'Gera e exibe a evolução psiquiátrica usando os dados da consulta aberta.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>{const out=generateEvolution();goPage('evolucao');return{generated:true,missing:out.missing,text:out.text}}});
  }

  init();
})();
