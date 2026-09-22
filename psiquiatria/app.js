/* ==========================================================================
   Consulta Psiquiátrica — aplicação
   Tudo roda no navegador. Nenhum dado de paciente sai do dispositivo.
   ========================================================================== */
(function(){
"use strict";

var F = window.PSIQ_FARMACOS, E = window.PSIQ_ESCALAS,
    C = window.PSIQ_CRITERIOS, P = window.PSIQ_PROTOCOLOS;

/* ---------- utilidades ---------- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function el(sel,root){ return (root||document).querySelector(sel); }
function els(sel,root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
function hoje(){ var d=new Date(); return ("0"+d.getDate()).slice(-2)+"/"+("0"+(d.getMonth()+1)).slice(-2)+"/"+d.getFullYear(); }
function agora(){ var d=new Date(); return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); }
function slug(s){ return String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase(); }
function get(o,path){ return path.split(".").reduce(function(a,k){ return a==null?a:a[k]; }, o); }
function set(o,path,v){ var ks=path.split("."), last=ks.pop();
  var t=ks.reduce(function(a,k){ if(a[k]==null) a[k]={}; return a[k]; }, o); t[last]=v; }

/* ---------- estado ---------- */
var KEY = "psiq-consulta-v1";
var S = {
  tab:"consulta",
  pac:{iniciais:"",idade:"",sexo:"",peso:"",registro:"",data:hoje(),hora:agora(),local:"",acompanhante:""},
  anam:{queixa:"",hda:"",psiq:"",medatual:"",clinico:"",subst:"",familiar:"",social:"",exame:""},
  eem:{}, eemObs:"",
  imp:{hipoteses:"",cid:"",conduta:"",retorno:""},
  escalas:{}, dx:{},
  rx:{itens:[], prof:{nome:"",crm:"",end:""}},
  risco:{nivel:"",fat:{},plano:""},
  farmBusca:"", farmClasse:""
};
try{ var raw=localStorage.getItem(KEY); if(raw){ var o=JSON.parse(raw);
  Object.keys(o).forEach(function(k){ if(k in S) S[k]=o[k]; }); } }catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* ---------- toast ---------- */
var toastT;
function toast(msg){
  var t = el("#toast"); if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(function(){ t.hidden = true; }, 2200);
}
function copiar(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ toast("Copiado"); },function(){ fallbackCopy(txt); });
  } else fallbackCopy(txt);
}
function fallbackCopy(txt){
  var ta=document.createElement("textarea"); ta.value=txt; ta.setAttribute("readonly","");
  ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); toast("Copiado"); }catch(e){ toast("Selecione e copie manualmente"); }
  document.body.removeChild(ta);
}

/* ---------- abas ---------- */
var TABS = [
  {id:"consulta",   l:"Consulta"},
  {id:"escalas",    l:"Escalas"},
  {id:"diagnostico",l:"Diagnóstico"},
  {id:"farmacos",   l:"Bulário"},
  {id:"receita",    l:"Receita"},
  {id:"emergencia", l:"Emergência"},
  {id:"risco",      l:"Risco"},
  {id:"especiais",  l:"Especiais"},
  {id:"nota",       l:"Nota"}
];

/* ---------- componentes ---------- */
function campo(label,path,tipo,hint,attrs){
  var v = get(S,path)||"";
  return '<label class="f">'+esc(label)+(hint?' <span class="hint">'+esc(hint)+'</span>':'')+
    '<input type="'+(tipo||"text")+'" id="fld-'+path.replace(/\./g,"-")+'" data-bind="'+path+'" value="'+esc(v)+'" '+(attrs||"")+'></label>';
}
function area(label,path,hint,rows){
  var v = get(S,path)||"";
  return '<label class="f">'+esc(label)+(hint?' <span class="hint">'+esc(hint)+'</span>':'')+
    '<textarea id="fld-'+path.replace(/\./g,"-")+'" data-bind="'+path+'" rows="'+(rows||3)+'">'+esc(v)+'</textarea></label>';
}
function selMulti(item){
  var sel = S.eem[item.k]||"";
  return '<label class="f">'+esc(item.l)+'<select data-eem="'+item.k+'">'+
    '<option value="">—</option>'+
    item.o.map(function(x){ return '<option value="'+esc(x)+'"'+(sel===x?" selected":"")+'>'+esc(x)+'</option>'; }).join("")+
    '</select></label>';
}
function tagRx(tipo){
  var m = {branca:["branca","Controle especial · 2 vias"],azul:["azul","Notificação B · talonário azul"],
           amarela:["amarela","Notificação A · talonário amarelo"],comum:["comum","Receita simples"]};
  var t = m[tipo]||m.comum;
  return '<span class="rx '+t[0]+'">'+esc(t[1])+'</span>';
}

/* ==========================================================================
   VIEW: CONSULTA
   ========================================================================== */
function viewConsulta(){
  var eemCampos = P.eem.map(selMulti).join("");
  return [
   '<div class="section-head"><div><span class="eyebrow">Módulo 1</span><h2>Consulta</h2></div></div>',
   '<p class="lede">Roteiro de anamnese psiquiátrica e exame do estado mental. Só o que você digitar entra na nota — o aplicativo não preenche lacuna nenhuma por conta própria.</p>',

   '<div class="card"><h3>Identificação</h3><div class="grid g4">',
     campo("Iniciais","pac.iniciais","text","sem nome completo"),
     campo("Idade","pac.idade","text","anos"),
     campo("Sexo","pac.sexo"),
     campo("Peso","pac.peso","text","kg — usado no cálculo pediátrico"),
     campo("Registro/prontuário","pac.registro"),
     campo("Data","pac.data"),
     campo("Hora","pac.hora"),
     campo("Local","pac.local","text","consultório, PS, enfermaria"),
   '</div><div class="grid" style="margin-top:12px">'+campo("Acompanhante / informante","pac.acompanhante","text","quem trouxe a história — muda o peso do relato")+'</div></div>',

   '<div class="card"><h3>Anamnese</h3><div class="stack">',
     area("Queixa principal e duração","anam.queixa","nas palavras do paciente",2),
     area("História da doença atual","anam.hda","início, curso, gatilhos, sintomas por domínio, tratamentos tentados e resposta",5),
     area("Antecedentes psiquiátricos","anam.psiq","episódios prévios, internações, tentativas de suicídio, ECT, resposta a fármacos anteriores",3),
     area("Medicações em uso","anam.medatual","psicotrópicas e não psicotrópicas, com dose e tempo de uso",3),
     area("Antecedentes clínicos","anam.clinico","tireoide, neurológico, cardiovascular, TCE, epilepsia, alergias",3),
     area("Uso de substâncias","anam.subst","álcool, tabaco, cannabis, cocaína/crack, estimulantes, benzodiazepínicos — quantidade, frequência, última vez",3),
     area("História familiar","anam.familiar","transtorno mental, suicídio, resposta a fármacos em parentes",2),
     area("História pessoal e social","anam.social","desenvolvimento, escolaridade, trabalho, relações, moradia, rede de apoio, violência, situação jurídica",3),
     area("Exame físico e neurológico","anam.exame","sinais vitais, neurológico dirigido, sinais de abstinência/intoxicação, extrapiramidal",3),
   '</div></div>',

   '<div class="card"><h3>Exame do Estado Mental</h3>',
     '<div class="grid g3">'+eemCampos+'</div>',
     '<div style="margin-top:12px">'+area("Observações do EEM","eemObs","descrição livre do que os campos acima não cobrem",3)+'</div>',
     '<div class="row" style="margin-top:10px"><button class="btn sm" data-act="eem-normal">Preencher padrão sem alterações</button>',
     '<button class="btn sm ghost" data-act="eem-limpar">Limpar EEM</button></div>',
   '</div>',

   '<div class="card"><h3>Impressão e conduta <span class="tag">só o que você escrever</span></h3><div class="stack">',
     area("Hipóteses diagnósticas","imp.hipoteses","",2),
     campo("CID-10","imp.cid","text","consulte a aba Diagnóstico"),
     area("Conduta","imp.conduta","prescrição, exames, encaminhamentos, orientações",4),
     campo("Retorno","imp.retorno","text","prazo e condições de retorno antecipado"),
   '</div></div>',

   '<div class="fora-prontuario no-print"><span class="eyebrow">Não entra no prontuário — lembretes do aplicativo</span>',
   '<ul class="tight">',
   '<li>Toda consulta psiquiátrica precisa de avaliação de risco documentada — use a aba <b>Risco</b>.</li>',
   '<li>Perguntou sobre mania/hipomania prévias? É o erro diagnóstico mais caro em quem chega deprimido.</li>',
   '<li>Perguntou sobre acesso a arma de fogo e a medicação acumulada em casa?</li>',
   '<li>Rastreou apneia do sono, tireoide e uso de substância antes de escalar psicofármaco?</li>',
   '</ul></div>'
  ].join("");
}

/* ==========================================================================
   VIEW: ESCALAS
   ========================================================================== */
function escalaScore(e){
  var v = (S.escalas[e.id]||{}).vals||[];
  var tot = 0, resp = 0;
  e.itens.forEach(function(it,i){ if(v[i]!=null && v[i]!==""){ tot += Number(v[i]); resp++; } });
  return {tot:tot, resp:resp, n:e.itens.length};
}
function escalaFaixa(e,tot){
  for(var i=0;i<e.faixas.length;i++) if(tot<=e.faixas[i].max) return e.faixas[i];
  return e.faixas[e.faixas.length-1];
}
function escalaAlertas(e){
  var v=(S.escalas[e.id]||{}).vals||[], out=[];
  (e.alertas||[]).forEach(function(a){ if(v[a.i]!=null && Number(v[a.i])>=a.min) out.push(a); });
  return out;
}
function boardHTML(e){
  var sc = escalaScore(e), f = escalaFaixa(e,sc.tot), al = escalaAlertas(e);
  var pct = e.max ? Math.min(100, Math.round(sc.tot/e.max*100)) : 0;
  var extra = "";
  if(e.id==="asrs"){
    var v=(S.escalas.asrs||{}).vals||[], pos=0;
    e.itens.forEach(function(it,i){ if(v[i]!=null && Number(v[i])>=it.corte) pos++; });
    extra = '<span class="tag '+(pos>=4?"warn":"ok")+'">Itens na zona sombreada: '+pos+'/6 — '+(pos>=4?"rastreio POSITIVO":"rastreio negativo")+'</span>';
  }
  if(e.id==="rass"){
    var r=(S.escalas.rass||{}).vals||[];
    extra = '<span class="tag info">RASS registrado: '+(r[0]==null?"—":(r[0]>0?"+":"")+r[0])+'</span>';
  }
  return '<div class="score-board" data-board="'+e.id+'">'+
    (e.unico?"":'<div><span class="score-num">'+sc.tot+'</span><span class="score-den"> / '+e.max+'</span></div>'+
    '<div class="meter"><i class="'+f.cor+'" style="width:'+pct+'%"></i></div>')+
    '<span class="tag '+f.cor+'">'+esc(f.l)+'</span>'+ extra +
    '<span class="tag">'+sc.resp+'/'+sc.n+' respondidos</span>'+
    '<button class="btn sm" data-act="esc-copiar" data-id="'+e.id+'">Copiar resultado</button>'+
    '<button class="btn sm ghost" data-act="esc-limpar" data-id="'+e.id+'">Limpar</button>'+
    '</div>'+
    '<div class="note '+f.cor+'" style="margin-top:8px">'+esc(f.txt)+'</div>'+
    al.map(function(a){ return '<div class="note '+a.cor+'" style="margin-top:8px"><b>Alerta:</b> '+esc(a.txt)+'</div>'; }).join("");
}
function viewEscalas(){
  var doms = {};
  E.forEach(function(e){ (doms[e.dom]=doms[e.dom]||[]).push(e); });
  var html = ['<div class="section-head"><div><span class="eyebrow">Módulo 2</span><h2>Escalas</h2></div></div>',
    '<p class="lede">Vinte instrumentos com pontuação e interpretação automáticas. Escala é apoio: quem diagnostica é o exame clínico.</p>'];
  Object.keys(doms).forEach(function(d){
    html.push('<div class="card"><h3>'+esc(d)+'</h3>');
    doms[d].forEach(function(e){
      var sc = escalaScore(e);
      html.push('<details class="acc" data-esc="'+e.id+'"><summary>'+
        '<span class="acc-title"><b>'+esc(e.sigla)+'</b><i>'+esc(e.nome)+'</i></span>'+
        (sc.resp? '<span class="tag '+escalaFaixa(e,sc.tot).cor+'">'+(e.unico?"registrado":sc.tot+" pts")+'</span>':'')+
        '<span class="tag">'+esc(e.tempo)+'</span></summary><div class="acc-body">'+
        '<p style="font-size:13.5px;color:var(--ink-2)">'+esc(e.desc)+'</p>'+
        '<div class="note info">'+esc(e.instr||"")+'</div>'+
        '<div data-itens="'+e.id+'">'+itensHTML(e)+'</div>'+
        '<div data-res="'+e.id+'">'+boardHTML(e)+'</div>'+
        '<p style="font-size:12px;color:var(--muted)"><b>Referência:</b> '+esc(e.ref)+'</p>'+
        (e.nota?'<div class="note"><b>Bizu:</b> '+esc(e.nota)+'</div>':'')+
        '</div></details>');
    });
    html.push('</div>');
  });
  return html.join("");
}
function itensHTML(e){
  var v = (S.escalas[e.id]||{}).vals||[];
  return e.itens.map(function(it,i){
    var opts = it.opts || e.opts;
    return '<div class="escala-item"><div class="num">'+(i+1)+'</div><div class="txt">'+esc(it.t)+'</div>'+
      '<div class="opts">'+opts.map(function(o,j){
        var ck = (v[i]!=null && Number(v[i])===Number(o.v)) ? " checked":"";
        return '<label class="opt"><input type="radio" name="'+e.id+'-'+i+'" value="'+o.v+'" data-escala="'+e.id+'" data-idx="'+i+'"'+ck+'>'+
               '<span>'+esc(o.l)+'</span></label>';
      }).join("")+'</div></div>';
  }).join("");
}
function textoEscala(e){
  var sc=escalaScore(e), f=escalaFaixa(e,sc.tot), al=escalaAlertas(e);
  var t = e.sigla+": "+(e.unico? ((S.escalas[e.id]||{}).vals||[])[0] : sc.tot+"/"+e.max)+" — "+f.l+". "+f.txt;
  if(al.length) t += " ALERTA: "+al.map(function(a){return a.txt;}).join(" ");
  return t;
}

/* ==========================================================================
   VIEW: DIAGNÓSTICO
   ========================================================================== */
function dxEstado(c){
  var st = S.dx[c.id]||{};
  var blocosOk = c.blocos.map(function(b,bi){
    var marc = st[bi]||[];
    var n = marc.length;
    var okMin = n >= b.min;
    var okObr = true;
    if(b.obrig) okObr = b.obrig.some(function(i){ return marc.indexOf(i)>=0; });
    return {n:n, ok:okMin&&okObr, min:b.min, okObr:okObr};
  });
  return {blocos:blocosOk, ok: blocosOk.every(function(x){ return x.ok; })};
}
function dxTagTexto(x,b){ return x.n+' / mín '+b.min+(x.okObr?"":" · falta obrigatório"); }
function dxBoardHTML(c){
  var est = dxEstado(c);
  return '<span class="tag '+(est.ok?"ok":"warn")+'">'+
    (est.ok? "Critérios preenchidos" : "Critérios ainda NÃO preenchidos")+'</span>'+
    '<span class="tag info mono">CID-10 '+esc(c.cid)+'</span>'+
    '<button class="btn sm" data-act="dx-copiar" data-id="'+c.id+'">Copiar para a nota</button>'+
    '<button class="btn sm ghost" data-act="dx-limpar" data-id="'+c.id+'">Limpar</button>';
}
function dxCardBody(c){
  var st = S.dx[c.id]||{}, est = dxEstado(c);
  var html = '<p style="font-size:13.5px;color:var(--ink-2)">'+esc(c.resumo)+'</p>';
  c.blocos.forEach(function(b,bi){
    var marc = st[bi]||[];
    html += '<div class="card flat"><h3>'+esc(b.t)+' <span class="tag '+(est.blocos[bi].ok?"ok":"warn")+'" data-dxtag="'+c.id+'-'+bi+'">'+
            dxTagTexto(est.blocos[bi],b)+'</span></h3>';
    if(b.obrigTxt) html += '<div class="note warn" style="margin-bottom:8px">'+esc(b.obrigTxt)+'</div>';
    html += '<div class="opts" style="flex-direction:column;align-items:stretch;gap:5px">'+
      b.itens.map(function(it,i){
        var ck = marc.indexOf(i)>=0 ? " checked":"";
        return '<label class="opt" style="justify-content:flex-start;border-radius:8px;padding:6px 10px">'+
          '<input type="checkbox" data-dx="'+c.id+'" data-bloco="'+bi+'" data-item="'+i+'"'+ck+'>'+
          '<span>'+esc(it)+'</span></label>';
      }).join("")+'</div></div>';
  });
  html += '<div class="score-board" data-dxboard="'+c.id+'">'+dxBoardHTML(c)+'</div>';
  if(c.espec && c.espec.length)
    html += '<div class="card flat"><h3>Especificadores</h3><ul class="tight">'+c.espec.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul></div>';
  html += '<div class="card flat"><h3>Diferenciais e o que descartar</h3><ul class="tight">'+
          c.dif.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul></div>';
  html += '<div class="note info"><b>Conduta:</b> '+esc(c.conduta)+'</div>';
  html += '<p style="font-size:12px;color:var(--muted)"><b>Referência:</b> '+esc(c.ref)+'</p>';
  return html;
}
function viewDiagnostico(){
  var grupos={};
  C.forEach(function(c){ (grupos[c.grupo]=grupos[c.grupo]||[]).push(c); });
  var html=['<div class="section-head"><div><span class="eyebrow">Módulo 3</span><h2>Critérios diagnósticos</h2></div></div>',
   '<p class="lede">Paráfrase clínica resumida do DSM-5-TR com o código CID-10 que o sistema hospitalar exige. Marque o que está presente; o cabeçalho de cada bloco diz se o critério fechou.</p>',
   '<div class="note warn"><b>Antes de fechar qualquer diagnóstico primário:</b> descarte causa orgânica e induzida por substância. O checklist de investigação está em <b>Emergência → Primeiro episódio psicótico</b> e em <b>Especiais → Monitorização laboratorial</b>.</div>'];
  Object.keys(grupos).forEach(function(g){
    html.push('<div class="card"><h3>'+esc(g)+'</h3>');
    grupos[g].forEach(function(c){
      var est=dxEstado(c);
      html.push('<details class="acc" data-dxcard="'+c.id+'"><summary>'+
        '<span class="acc-title"><b>'+esc(c.nome)+'</b><i>'+esc(c.resumo)+'</i></span>'+
        '<span class="tag info mono">'+esc(c.cid)+'</span>'+
        (est.ok?'<span class="tag ok" data-dxok="1">preenchido</span>':'')+
        '</summary><div class="acc-body" data-dxbody="'+c.id+'">'+dxCardBody(c)+'</div></details>');
    });
    html.push('</div>');
  });
  return html.join("");
}
function textoDx(c){
  var est=dxEstado(c), st=S.dx[c.id]||{};
  var linhas=[c.nome+" (CID-10 "+c.cid+") — "+(est.ok?"critérios preenchidos":"critérios não preenchidos")];
  c.blocos.forEach(function(b,bi){
    var marc=st[bi]||[];
    if(marc.length) linhas.push("  "+b.t+": "+marc.map(function(i){return b.itens[i];}).join("; "));
  });
  return linhas.join("\n");
}

window.PSIQ_APP = {S:S, save:save, esc:esc, el:el, els:els, toast:toast, copiar:copiar,
  campo:campo, area:area, tagRx:tagRx, slug:slug, hoje:hoje, agora:agora,
  viewConsulta:viewConsulta, viewEscalas:viewEscalas, viewDiagnostico:viewDiagnostico,
  itensHTML:itensHTML, boardHTML:boardHTML, dxCardBody:dxCardBody, dxEstado:dxEstado, dxBoardHTML:dxBoardHTML, dxTagTexto:dxTagTexto,
  textoEscala:textoEscala, textoDx:textoDx, escalaScore:escalaScore, escalaFaixa:escalaFaixa,
  TABS:TABS, F:F, E:E, C:C, P:P, get:get, set:set};
})();

/* ==========================================================================
   Parte 2 — bulário, receita, emergência, risco, especiais, nota, roteador
   ========================================================================== */
(function(){
"use strict";
var A = window.PSIQ_APP, S = A.S, esc = A.esc, el = A.el, els = A.els;
var F = A.F, E = A.E, C = A.C, P = A.P;

/* ==================== BULÁRIO ==================== */
function drugBody(d){
  var rows = [
    ["Apresentações", d.apres], ["Dose inicial", d.ini], ["Dose alvo", d.alvo], ["Dose máxima", d.max],
    ["Titulação", d.tit], ["Efeitos adversos", d.adv], ["Interações / CYP", d.cyp],
    ["Monitorização", d.monit], ["Ajuste renal", d.ren], ["Ajuste hepático", d.hep], ["Gestação / lactação", d.gest]
  ];
  return '<div class="drug-body">'+
    '<div class="row">'+A.tagRx(d.rx)+'<span class="tag '+(d.qt==="alto"?"crit":d.qt==="moderado"?"warn":"ok")+'">QTc: '+esc(d.qt)+'</span>'+
      (d.ind||[]).map(function(i){ return '<span class="tag accent">'+esc(i)+'</span>'; }).join("")+'</div>'+
    '<dl class="kv">'+rows.map(function(r){
      return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1]||"—")+'</dd>'; }).join("")+'</dl>'+
    (d.bz? '<div class="note info"><b>Bizu:</b> '+esc(d.bz)+'</div>':'')+
    '<div class="row"><button class="btn sm" data-act="rx-add" data-drug="'+esc(d.n)+'">Adicionar à receita</button>'+
     '<button class="btn sm ghost" data-act="drug-copy" data-drug="'+esc(d.n)+'">Copiar resumo</button></div>'+
    '</div>';
}
function viewFarmacos(){
  var classes = []; F.forEach(function(d){ if(classes.indexOf(d.c)<0) classes.push(d.c); });
  var q = A.slug(S.farmBusca||""), cl = S.farmClasse||"";
  var lista = F.filter(function(d){
    if(cl && d.c!==cl) return false;
    if(!q) return true;
    return A.slug(d.n+" "+d.c+" "+(d.ind||[]).join(" ")+" "+(d.bz||"")).indexOf(q)>=0;
  });
  return [
  '<div class="section-head"><div><span class="eyebrow">Módulo 4</span><h2>Bulário psicofarmacológico</h2></div></div>',
  '<p class="lede">'+F.length+' fármacos com dose, titulação, ajuste renal e hepático, interações e a cor do talonário exigido pela Portaria 344/98.</p>',
  '<div class="card no-print"><div class="grid g2">',
    '<label class="f">Buscar <span class="hint">nome, classe ou indicação</span><input type="text" id="farm-busca" value="'+esc(S.farmBusca||"")+'" placeholder="ex.: bipolar, clozapina, acatisia"></label>',
    '<label class="f">Classe<select id="farm-classe"><option value="">Todas</option>'+
      classes.map(function(c){ return '<option value="'+esc(c)+'"'+(cl===c?" selected":"")+'>'+esc(c)+'</option>'; }).join("")+
    '</select></label>',
  '</div><p style="margin-top:8px;font-size:12px;color:var(--muted)">'+lista.length+' resultado(s)</p></div>',
  '<div id="farm-lista">'+ (lista.length? lista.map(function(d){
      return '<details class="drug"><summary><div class="drug-line"><span class="drug-name">'+esc(d.n)+'</span>'+
        '<span class="drug-cls">'+esc(d.c)+'</span></div>'+
        '<div class="drug-line"><span class="drug-dose">'+esc(d.alvo)+'</span>'+A.tagRx(d.rx)+'</div></summary>'+
        drugBody(d)+'</details>';
    }).join("") : '<p class="empty">Nada encontrado. Tente outro termo.</p>') + '</div>'
  ].join("");
}
function textoFarmaco(d){
  return [d.n+" ("+d.c+")", "Início: "+d.ini, "Alvo: "+d.alvo, "Máx: "+d.max, "Titulação: "+d.tit,
    "Adversos: "+d.adv, "Renal: "+d.ren, "Hepático: "+d.hep, "Monitorização: "+d.monit,
    "Receituário: "+({branca:"controle especial 2 vias",azul:"notificação B (azul)",amarela:"notificação A (amarela)",comum:"receita simples"}[d.rx])].join("\n");
}

/* ==================== RECEITA ==================== */
var RX_LABEL = {branca:"RECEITUÁRIO DE CONTROLE ESPECIAL (2 VIAS)", azul:"NOTIFICAÇÃO DE RECEITA B — TALONÁRIO AZUL",
                amarela:"NOTIFICAÇÃO DE RECEITA A — TALONÁRIO AMARELO", comum:"RECEITA SIMPLES"};
function rxLinha(it){
  var nome = (it.nome||"").toUpperCase().trim();
  var conc = (it.conc||"").toUpperCase().trim();
  var qtd  = (it.qtd||"").toUpperCase().trim();
  var forma= (it.forma||"").toUpperCase().trim();
  var pos  = (it.posologia||"").toUpperCase().trim();
  var dur  = (it.duracao||"").toUpperCase().trim();
  var esq  = (nome+(conc?" "+conc:"")) + " -------- " + (qtd?qtd+" ":"") + forma;
  var tail = pos + (dur? " POR "+dur : "");
  return esq + (tail? " / "+tail : "") + ".";
}
function receitaTexto(){
  var grupos = {};
  S.rx.itens.forEach(function(it){ var t=it.rx||"comum"; (grupos[t]=grupos[t]||[]).push(it); });
  var out = [];
  ["amarela","azul","branca","comum"].forEach(function(t){
    if(!grupos[t]) return;
    out.push("=== "+RX_LABEL[t]+" ===");
    if(t==="amarela") out.push("(Notificação de Receita A: um medicamento por notificação, até 30 dias de tratamento.)");
    if(t==="azul") out.push("(Notificação de Receita B: até 5 medicamentos, até 60 dias de tratamento.)");
    if(t==="branca") out.push("(Receita de Controle Especial em 2 vias, até 5 medicamentos, até 60 dias.)");
    out.push("");
    grupos[t].forEach(function(it,i){ out.push(String(i+1).padStart(2,"0")+") "+rxLinha(it)); });
    out.push("");
  });
  if(!out.length) return "";
  var cab = [];
  cab.push("PACIENTE: "+(S.pac.iniciais||"[PENDENTE]")+"   IDADE: "+(S.pac.idade||"[PENDENTE]"));
  cab.push("DATA: "+(S.pac.data||A.hoje()));
  cab.push("");
  var rod = ["", "_______________________________________",
    (S.rx.prof.nome||"[PENDENTE — nome do médico]"),
    "CRM "+(S.rx.prof.crm||"[PENDENTE]"),
    (S.rx.prof.end||"")];
  return cab.concat(out).concat(rod).join("\n");
}
function viewReceita(){
  var datalist = '<datalist id="dl-farmacos">'+F.map(function(d){ return '<option value="'+esc(d.n)+'">'; }).join("")+'</datalist>';
  var itens = S.rx.itens.map(function(it,i){
    return '<div class="card flat" data-rxitem="'+i+'"><div class="grid g3">'+
      '<label class="f">Fármaco<input type="text" list="dl-farmacos" data-rx="nome" data-i="'+i+'" value="'+esc(it.nome||"")+'"></label>'+
      '<label class="f">Concentração<input type="text" data-rx="conc" data-i="'+i+'" value="'+esc(it.conc||"")+'" placeholder="50MG"></label>'+
      '<label class="f">Quantidade<input type="text" data-rx="qtd" data-i="'+i+'" value="'+esc(it.qtd||"")+'" placeholder="30"></label>'+
      '<label class="f">Forma<input type="text" data-rx="forma" data-i="'+i+'" value="'+esc(it.forma||"")+'" placeholder="CPS / COMPRIMIDOS / FRASCO"></label>'+
      '<label class="f">Posologia<input type="text" data-rx="posologia" data-i="'+i+'" value="'+esc(it.posologia||"")+'" placeholder="TOMAR 01 COMPRIMIDO PELA MANHÃ"></label>'+
      '<label class="f">Duração<input type="text" data-rx="duracao" data-i="'+i+'" value="'+esc(it.duracao||"")+'" placeholder="30 DIAS"></label>'+
      '<label class="f">Receituário<select data-rx="rx" data-i="'+i+'">'+
        ["comum","branca","azul","amarela"].map(function(t){
          return '<option value="'+t+'"'+((it.rx||"comum")===t?" selected":"")+'>'+esc(RX_LABEL[t])+'</option>'; }).join("")+
      '</select></label></div>'+
      '<div class="row" style="margin-top:8px">'+A.tagRx(it.rx||"comum")+
      '<code class="mono" style="font-size:11.5px;flex:1 1 200px">'+esc(rxLinha(it))+'</code>'+
      '<button class="btn sm danger" data-act="rx-del" data-i="'+i+'">Remover</button></div></div>';
  }).join("");
  return [
  '<div class="section-head"><div><span class="eyebrow">Módulo 5</span><h2>Receita</h2></div></div>',
  '<p class="lede">Saída em linha única e caixa alta, pronta para colar ou imprimir. Os itens são separados automaticamente por tipo de talonário — controlado e não controlado não vão na mesma receita.</p>',
  datalist,
  '<div class="card no-print"><h3>Identificação do prescritor</h3><div class="grid g3">'+
    A.campo("Nome","rx.prof.nome")+A.campo("CRM","rx.prof.crm")+A.campo("Endereço / unidade","rx.prof.end")+
  '</div></div>',
  '<div class="card no-print"><h3>Itens</h3><div id="rx-itens">'+(itens||'<p class="empty">Nenhum item. Adicione abaixo ou pelo bulário.</p>')+'</div>'+
    '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="rx-novo">+ Adicionar item</button>'+
    '<button class="btn sm ghost" data-act="rx-zerar">Zerar receita</button></div></div>',
  '<div class="card"><h3>Saída <button class="btn sm no-print" data-act="rx-copiar">Copiar</button>'+
    '<button class="btn sm no-print" data-act="imprimir">Imprimir</button></h3>'+
    '<pre class="out" id="rx-out">'+esc(receitaTexto()||"— sem itens —")+'</pre></div>',
  '<div class="fora-prontuario no-print"><span class="eyebrow">Não entra no prontuário — conferência antes de assinar</span><ul class="tight">'+
   '<li>Notificação de Receita <b>A</b> (amarela): <b>um</b> medicamento por notificação, até 30 dias de tratamento.</li>'+
   '<li>Notificação de Receita <b>B</b> (azul) e Receita de Controle Especial (branca, 2 vias): até 5 medicamentos, até 60 dias.</li>'+
   '<li>Paciente com risco de suicídio: fracione a quantidade e evite tricíclico — 10 dias de amitriptilina em dose plena são potencialmente letais.</li>'+
   '<li>Conferiu soma de QTc, interação por CYP e ajuste renal/hepático? Tudo em <b>Especiais</b>.</li></ul></div>'
  ].join("");
}

/* ==================== EMERGÊNCIA ==================== */
function blocosHTML(blocos){
  return blocos.map(function(b){
    return '<div class="card flat"><h3>'+esc(b.t)+'</h3><ul class="tight">'+
      b.itens.map(function(i){ return '<li>'+esc(i)+'</li>'; }).join("")+'</ul></div>';
  }).join("");
}
function viewEmergencia(){
  var html=['<div class="section-head"><div><span class="eyebrow">Módulo 6</span><h2>Emergências</h2></div></div>',
   '<p class="lede">Doze quadros em que a decisão é de minutos. Ordem fixa: descartar causa orgânica, estabilizar, depois psiquiatrizar.</p>',
   '<div class="note crit"><b>Regra que não muda:</b> glicemia capilar em todo agitado. Agitação de início súbito em paciente sem história psiquiátrica é orgânica até prova em contrário.</div>'];
  P.emergencias.forEach(function(p){
    html.push('<details class="acc"><summary>'+
      '<span class="acc-title"><b>'+esc(p.nome)+'</b><i>'+esc(p.gatilho)+'</i></span>'+
      '<span class="tag '+p.cor+'">'+
      (p.cor==="crit"?"emergência":p.cor==="warn"?"urgência":"investigação")+'</span></summary><div class="acc-body">'+
      '<div class="note '+p.cor+'"><b>Quando pensar:</b> '+esc(p.gatilho)+'</div>'+
      blocosHTML(p.blocos)+
      '<p style="font-size:12px;color:var(--muted)">'+esc(p.ref)+'</p>'+
      '<button class="btn sm no-print" data-act="prot-copiar" data-tipo="emerg" data-id="'+p.id+'">Copiar protocolo</button>'+
      '</div></details>');
  });
  return html.join("");
}

/* ==================== RISCO ==================== */
function viewRisco(){
  var R = P.risco;
  function lista(arr,grupo){
    return arr.map(function(f,i){
      var k = grupo+"-"+i, ck = S.risco.fat[k]? " checked":"";
      return '<label class="opt" style="justify-content:flex-start;border-radius:8px;padding:6px 10px">'+
        '<input type="checkbox" data-risco="'+k+'"'+ck+'><span>'+esc(f)+'</span></label>';
    }).join("");
  }
  var cont = {e:0,d:0,p:0};
  Object.keys(S.risco.fat).forEach(function(k){ if(S.risco.fat[k]) cont[k.charAt(0)]++; });
  return [
  '<div class="section-head"><div><span class="eyebrow">Módulo 7</span><h2>Risco de suicídio</h2></div></div>',
  '<p class="lede">Estratificação, plano de segurança e a base legal da internação involuntária. Toda consulta psiquiátrica precisa de avaliação de risco registrada.</p>',
  '<div class="note warn"><b>Antes de tudo:</b> aplique o <b>C-SSRS</b> na aba Escalas. Itens 4, 5 ou 6 positivos = risco alto, independentemente do resto.</div>',

  '<div class="card"><h3>Fatores de risco estáticos <span class="tag">'+cont.e+' marcados</span></h3>'+
   '<div class="opts" style="flex-direction:column;align-items:stretch;gap:5px">'+lista(R.fatores.estaticos,"e")+'</div></div>',
  '<div class="card"><h3>Fatores dinâmicos — os que você pode modificar hoje <span class="tag">'+cont.d+' marcados</span></h3>'+
   '<div class="opts" style="flex-direction:column;align-items:stretch;gap:5px">'+lista(R.fatores.dinamicos,"d")+'</div></div>',
  '<div class="card"><h3>Fatores de proteção <span class="tag ok">'+cont.p+' marcados</span></h3>'+
   '<div class="opts" style="flex-direction:column;align-items:stretch;gap:5px">'+lista(R.fatores.protecao,"p")+'</div></div>',

  '<div class="card"><h3>Estratificação e conduta</h3>'+
   '<div class="row" style="margin-bottom:10px">'+R.niveis.map(function(n){
     return '<button class="btn sm '+(S.risco.nivel===n.n?"primary":"")+'" data-act="risco-nivel" data-n="'+n.n+'">'+n.n+'</button>'; }).join("")+'</div>'+
   R.niveis.map(function(n){
     var ativo = S.risco.nivel===n.n;
     return '<details class="acc"'+(ativo?" open":"")+'><summary><b>Risco '+n.n+'</b><span class="tag '+n.cor+'">'+esc(n.d)+'</span></summary>'+
       '<div class="acc-body"><ul class="tight">'+n.c.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join("")+'</ul></div></details>';
   }).join("")+'</div>',

  '<div class="card"><h3>Plano de segurança</h3>'+
   '<ol class="tight">'+R.plano.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join("")+'</ol>'+
   '<div style="margin-top:10px">'+A.area("Plano de segurança desta consulta","risco.plano","escreva com o paciente, nas palavras dele; este texto entra na nota",5)+'</div>'+
   '<div class="row"><button class="btn sm" data-act="risco-copiar">Copiar avaliação de risco</button></div></div>',

  '<div class="note info"><b>Base legal (Brasil):</b> Lei 10.216/2001. Internação voluntária (com consentimento escrito), involuntária (a pedido de terceiro ou por indicação médica, com comunicação ao Ministério Público em até 72 h) e compulsória (determinação judicial). Documente indicação, tentativas de manejo menos restritivo e quem foi comunicado.</div>',
  '<p style="font-size:12px;color:var(--muted)">'+esc(R.ref)+'</p>',
  '<div class="fora-prontuario no-print"><span class="eyebrow">Não entra no prontuário — o que costuma ser esquecido</span><ul class="tight">'+
   '<li>Desesperança prediz melhor que tristeza. Pergunte sobre o futuro, não só sobre o humor.</li>'+
   '<li>O primeiro mês após a alta hospitalar é o período de maior risco de toda a trajetória.</li>'+
   '<li>Acatisia e insônia grave são fatores de risco modificáveis <i>hoje</i>.</li>'+
   '<li>Restrição de meios só vale se um terceiro confirmar que foi feita.</li></ul></div>'
  ].join("");
}
function textoRisco(){
  var R=P.risco, out=["AVALIAÇÃO DE RISCO DE SUICÍDIO"];
  ["estaticos","dinamicos","protecao"].forEach(function(g,gi){
    var pref = ["e","d","p"][gi];
    var m = R.fatores[g].filter(function(f,i){ return S.risco.fat[pref+"-"+i]; });
    var rot = ["Fatores estáticos","Fatores dinâmicos","Fatores de proteção"][gi];
    out.push(rot+": "+(m.length? m.join("; ") : "nenhum assinalado"));
  });
  out.push("Nível de risco: "+(S.risco.nivel||"[PENDENTE]"));
  if(S.risco.plano) out.push("Plano de segurança: "+S.risco.plano);
  return out.join("\n");
}

/* ==================== ESPECIAIS ==================== */
function viewEspeciais(){
  var html=['<div class="section-head"><div><span class="eyebrow">Módulo 8</span><h2>Situações especiais</h2></div></div>',
   '<p class="lede">Gestação, idoso, pediatria, rim, fígado, QTc, CYP, troca e retirada de antidepressivo, monitorização laboratorial.</p>'];

  /* calculadora pediátrica */
  html.push('<div class="card"><h3>Calculadora de dose pediátrica</h3>'+
   '<p style="font-size:13px;color:var(--ink-2);margin-bottom:10px">Entra peso e mg/kg; sai dose total, volume e aviso de teto. Nada é assumido — o que você não informar fica em branco.</p>'+
   '<div class="grid g4">'+
   '<label class="f">Peso (kg)<input type="number" id="pd-peso" step="0.1" value="'+esc(S.pac.peso||"")+'"></label>'+
   '<label class="f">Dose (mg/kg)<input type="number" id="pd-mgkg" step="0.01" placeholder="0,5"></label>'+
   '<label class="f">Concentração (mg/mL)<input type="number" id="pd-conc" step="0.1" placeholder="20"></label>'+
   '<label class="f">Teto máximo (mg)<input type="number" id="pd-teto" step="1" placeholder="60"></label>'+
   '</div><div id="pd-out" class="note info" style="margin-top:10px">Informe peso e mg/kg.</div>'+
   '<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Fármaco</th><th>Início</th><th>Faixa</th><th>Teto</th><th>Apresentação</th><th>Observação</th></tr></thead><tbody>'+
   P.pediatria.map(function(p){ return '<tr><td><b>'+esc(p.n)+'</b></td><td>'+esc(p.mgkg)+'</td><td>'+esc(p.faixa)+'</td><td class="mono">'+esc(p.teto)+'</td><td>'+esc(p.conc)+'</td><td>'+esc(p.obs)+'</td></tr>'; }).join("")+
   '</tbody></table></div></div>');

  P.especiais.forEach(function(p){
    html.push('<details class="acc"><summary><b>'+esc(p.nome)+'</b><span class="tag '+p.cor+'">'+
      (p.cor==="crit"?"alto risco":p.cor==="warn"?"atenção":"referência")+'</span></summary><div class="acc-body">'+
      blocosHTML(p.blocos)+
      '<p style="font-size:12px;color:var(--muted)">'+esc(p.ref)+'</p>'+
      '<button class="btn sm no-print" data-act="prot-copiar" data-tipo="espec" data-id="'+p.id+'">Copiar</button>'+
      '</div></details>');
  });
  return html.join("");
}

/* ==================== NOTA ==================== */
function notaTexto(){
  var L=[], p=S.pac;
  L.push("AVALIAÇÃO PSIQUIÁTRICA — "+(p.data||A.hoje())+" "+(p.hora||""));
  if(p.local) L.push("LOCAL: "+p.local);
  L.push("PACIENTE: "+(p.iniciais||"[PENDENTE]")+" | IDADE: "+(p.idade||"[PENDENTE]")+
         " | SEXO: "+(p.sexo||"[PENDENTE]")+(p.peso?" | PESO: "+p.peso+" kg":"")+
         (p.registro?" | REGISTRO: "+p.registro:""));
  if(p.acompanhante) L.push("INFORMANTE: "+p.acompanhante);
  L.push("");
  var mapa = [["QUEIXA PRINCIPAL","queixa"],["HISTÓRIA DA DOENÇA ATUAL","hda"],["ANTECEDENTES PSIQUIÁTRICOS","psiq"],
    ["MEDICAÇÕES EM USO","medatual"],["ANTECEDENTES CLÍNICOS","clinico"],["USO DE SUBSTÂNCIAS","subst"],
    ["HISTÓRIA FAMILIAR","familiar"],["HISTÓRIA PESSOAL E SOCIAL","social"],["EXAME FÍSICO E NEUROLÓGICO","exame"]];
  mapa.forEach(function(m){ if(S.anam[m[1]]) { L.push(m[0]+":"); L.push(S.anam[m[1]]); L.push(""); } });

  var eem = P.eem.filter(function(i){ return S.eem[i.k]; });
  if(eem.length || S.eemObs){
    L.push("EXAME DO ESTADO MENTAL:");
    if(eem.length) L.push(eem.map(function(i){ return i.l+": "+S.eem[i.k]; }).join(" | "));
    if(S.eemObs) L.push(S.eemObs);
    L.push("");
  }
  var esc_ = E.filter(function(e){ return (S.escalas[e.id]||{}).vals && (S.escalas[e.id].vals||[]).some(function(v){ return v!=null&&v!==""; }); });
  if(esc_.length){ L.push("INSTRUMENTOS APLICADOS:"); esc_.forEach(function(e){ L.push("- "+A.textoEscala(e)); }); L.push(""); }

  var dxs = C.filter(function(c){ var st=S.dx[c.id]; return st && Object.keys(st).some(function(k){ return (st[k]||[]).length; }); });
  if(dxs.length){ L.push("CRITÉRIOS DIAGNÓSTICOS AVALIADOS:"); dxs.forEach(function(c){ L.push(A.textoDx(c)); }); L.push(""); }

  var temRisco = S.risco.nivel || S.risco.plano || Object.keys(S.risco.fat).some(function(k){ return S.risco.fat[k]; });
  if(temRisco){ L.push(textoRisco()); L.push(""); }

  if(S.imp.hipoteses){ L.push("HIPÓTESES DIAGNÓSTICAS:"); L.push(S.imp.hipoteses); L.push(""); }
  if(S.imp.cid){ L.push("CID-10: "+S.imp.cid); L.push(""); }
  if(S.imp.conduta){ L.push("CONDUTA:"); L.push(S.imp.conduta); L.push(""); }
  if(S.rx.itens.length){ L.push("PRESCRIÇÃO:"); S.rx.itens.forEach(function(it){ L.push("- "+rxLinha(it)); }); L.push(""); }
  if(S.imp.retorno){ L.push("RETORNO: "+S.imp.retorno); L.push(""); }
  L.push("_______________________________________");
  L.push((S.rx.prof.nome||"[PENDENTE — nome do médico]")+" — CRM "+(S.rx.prof.crm||"[PENDENTE]"));
  return L.join("\n");
}
function pendencias(){
  var p=[];
  if(!S.pac.iniciais) p.push("identificação do paciente");
  if(!S.anam.queixa) p.push("queixa principal");
  if(!P.eem.some(function(i){ return S.eem[i.k]; }) && !S.eemObs) p.push("exame do estado mental");
  if(!S.risco.nivel) p.push("estratificação de risco de suicídio");
  if(!S.imp.hipoteses) p.push("hipótese diagnóstica");
  if(!S.imp.conduta) p.push("conduta");
  if(!S.rx.prof.nome || !S.rx.prof.crm) p.push("nome e CRM do prescritor");
  return p;
}
function viewNota(){
  var pend = pendencias();
  return [
  '<div class="section-head"><div><span class="eyebrow">Módulo 9</span><h2>Nota da consulta</h2></div></div>',
  '<p class="lede">Compilação do que <i>você</i> preencheu. O aplicativo não acrescenta conduta, exame nem interpretação ao texto do prontuário.</p>',
  (pend.length? '<div class="note warn no-print"><b>Pendente:</b> '+esc(pend.join(" · "))+'</div>'
              : '<div class="note ok no-print">Todos os campos essenciais preenchidos.</div>'),
  '<div class="card"><h3>Texto para o prontuário'+
   '<button class="btn sm primary no-print" data-act="nota-copiar">Copiar</button>'+
   '<button class="btn sm no-print" data-act="imprimir">Imprimir</button>'+
   '<button class="btn sm no-print" data-act="nota-baixar">Baixar .txt</button></h3>'+
   '<pre class="out" id="nota-out">'+esc(notaTexto())+'</pre></div>',
  '<div class="card no-print"><h3>Dados desta consulta</h3>'+
   '<p style="font-size:13px;color:var(--ink-2)">Tudo fica salvo apenas neste navegador, neste dispositivo. Não há servidor e nada é enviado para lugar nenhum. Ao atender o próximo paciente, limpe.</p>'+
   '<div class="row" style="margin-top:10px"><button class="btn danger" data-act="nova-consulta">Nova consulta (apaga tudo)</button></div></div>'
  ].join("");
}

/* ==================== ROTEADOR ==================== */
function render(){
  var v = {consulta:A.viewConsulta, escalas:A.viewEscalas, diagnostico:A.viewDiagnostico,
           farmacos:viewFarmacos, receita:viewReceita, emergencia:viewEmergencia,
           risco:viewRisco, especiais:viewEspeciais, nota:viewNota}[S.tab] || A.viewConsulta;
  var pac = S.pac;
  var strip = [pac.iniciais||"sem identificação", pac.idade?pac.idade+" anos":"", pac.sexo, pac.peso?pac.peso+" kg":"", pac.local]
              .filter(Boolean).map(function(x){ return '<span class="chip-id">'+esc(x)+'</span>'; }).join("");
  document.getElementById("app").innerHTML =
   '<header class="topbar no-print"><div class="topbar-inner">'+
     '<div class="wordmark"><b>Consulta Psiquiátrica</b><span>apoio à decisão</span></div>'+
     '<div class="top-actions">'+
       '<button class="btn sm ghost" data-act="tema" title="Alternar tema">◐</button>'+
     '</div></div>'+
     '<div class="pt-strip">'+strip+'<span style="color:var(--muted);font-size:11.5px">'+esc(pac.data||"")+' '+esc(pac.hora||"")+'</span></div>'+
   '</header>'+
   '<nav class="nav no-print"><div class="nav-inner">'+
     A.TABS.map(function(t){ return '<button data-tab="'+t.id+'" aria-current="'+(S.tab===t.id)+'">'+esc(t.l)+'</button>'; }).join("")+
   '</div></nav>'+
   '<main class="wrap"><div class="view">'+v()+'</div></main>'+
   '<div class="dock no-print"><div class="dock-inner">'+
     '<button class="btn sm primary" data-act="nota-copiar">Copiar nota</button>'+
     '<button class="btn sm" data-tab="nota">Ver nota</button>'+
     '<span>Dados apenas neste dispositivo · sem servidor</span>'+
   '</div></div>';
  window.scrollTo(0,0);
}
function irPara(t){ S.tab=t; A.save(); render(); }

/* ==================== EVENTOS ==================== */
document.addEventListener("input", function(ev){
  var t = ev.target;
  if(t.dataset.bind){ A.set(S, t.dataset.bind, t.value); A.save(); return; }
  if(t.id==="farm-busca"){ S.farmBusca=t.value; A.save(); atualizarFarmacos(); return; }
  if(t.dataset.rx!=null){ var i=+t.dataset.i; S.rx.itens[i][t.dataset.rx]=t.value; A.save(); atualizarRx(i); return; }
  if(t.id && t.id.indexOf("pd-")===0){ calcPed(); return; }
});
document.addEventListener("change", function(ev){
  var t = ev.target;
  if(t.dataset.eem!=null){ S.eem[t.dataset.eem]=t.value; A.save(); return; }
  if(t.id==="farm-classe"){ S.farmClasse=t.value; A.save(); render(); return; }
  if(t.dataset.rx!=null){ var i=+t.dataset.i; S.rx.itens[i][t.dataset.rx]=t.value; A.save(); atualizarRx(i); return; }
  if(t.dataset.escala){
    var id=t.dataset.escala, idx=+t.dataset.idx;
    S.escalas[id]=S.escalas[id]||{vals:[]};
    S.escalas[id].vals[idx]=Number(t.value); A.save();
    var box=el('[data-res="'+id+'"]'); if(box) box.innerHTML=A.boardHTML(escalaById(id));
    return;
  }
  if(t.dataset.dx){
    var c=critById(t.dataset.dx), bi=+t.dataset.bloco, it=+t.dataset.item;
    S.dx[c.id]=S.dx[c.id]||{}; S.dx[c.id][bi]=S.dx[c.id][bi]||[];
    var arr=S.dx[c.id][bi], k=arr.indexOf(it);
    if(t.checked){ if(k<0) arr.push(it); } else if(k>=0) arr.splice(k,1);
    A.save();
    atualizarDx(c);
    return;
  }
  if(t.dataset.risco){ S.risco.fat[t.dataset.risco]=t.checked; A.save(); return; }
});
document.addEventListener("click", function(ev){
  var b = ev.target.closest("[data-tab],[data-act]"); if(!b) return;
  if(b.dataset.tab){ irPara(b.dataset.tab); return; }
  var a = b.dataset.act;

  if(a==="tema"){
    var cur = document.documentElement.getAttribute("data-theme");
    var dark = cur ? cur==="dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", dark?"light":"dark");
    try{ localStorage.setItem("psiq-tema", dark?"light":"dark"); }catch(e){}
    return;
  }
  if(a==="eem-normal"){
    P.eem.forEach(function(i){ S.eem[i.k]=i.o[0]; }); A.save(); render(); A.toast("EEM preenchido com o padrão — revise item a item"); return;
  }
  if(a==="eem-limpar"){ S.eem={}; A.save(); render(); return; }

  if(a==="esc-copiar"){ A.copiar(A.textoEscala(escalaById(b.dataset.id))); return; }
  if(a==="esc-limpar"){
    var id=b.dataset.id; S.escalas[id]={vals:[]}; A.save();
    var e=escalaById(id);
    el('[data-itens="'+id+'"]').innerHTML = A.itensHTML(e);
    el('[data-res="'+id+'"]').innerHTML = A.boardHTML(e);
    return;
  }
  if(a==="dx-copiar"){ A.copiar(A.textoDx(critById(b.dataset.id))); return; }
  if(a==="dx-limpar"){ var c=critById(b.dataset.id); S.dx[c.id]={}; A.save();
    var body=el('[data-dxbody="'+c.id+'"]'); if(body) body.innerHTML=A.dxCardBody(c); return; }

  if(a==="drug-copy"){ A.copiar(textoFarmaco(drugByName(b.dataset.drug))); return; }
  if(a==="rx-add"){
    var d=drugByName(b.dataset.drug);
    S.rx.itens.push({nome:d.n.toUpperCase(),conc:"",qtd:"",forma:"",posologia:"",duracao:"",rx:d.rx});
    A.save(); A.toast(d.n+" adicionado à receita"); return;
  }
  if(a==="rx-novo"){ S.rx.itens.push({nome:"",conc:"",qtd:"",forma:"",posologia:"",duracao:"",rx:"comum"}); A.save(); render(); return; }
  if(a==="rx-del"){ S.rx.itens.splice(+b.dataset.i,1); A.save(); render(); return; }
  if(a==="rx-zerar"){ if(confirm("Apagar todos os itens da receita?")){ S.rx.itens=[]; A.save(); render(); } return; }
  if(a==="rx-copiar"){ A.copiar(receitaTexto()||""); return; }
  if(a==="nota-copiar"){ A.copiar(notaTexto()); return; }
  if(a==="nota-baixar"){ baixar(notaTexto(), "consulta-"+(S.pac.iniciais||"paciente")+"-"+(S.pac.data||"").replace(/\//g,"-")+".txt"); return; }
  if(a==="imprimir"){ window.print(); return; }
  if(a==="risco-nivel"){ S.risco.nivel=b.dataset.n; A.save(); render(); return; }
  if(a==="risco-copiar"){ A.copiar(textoRisco()); return; }
  if(a==="prot-copiar"){
    var lista = b.dataset.tipo==="emerg"? P.emergencias : P.especiais;
    var p = lista.filter(function(x){ return x.id===b.dataset.id; })[0];
    var txt = p.nome+"\n"+(p.gatilho? p.gatilho+"\n":"")+
      p.blocos.map(function(bl){ return bl.t+"\n"+bl.itens.map(function(i){ return "- "+i; }).join("\n"); }).join("\n\n");
    A.copiar(txt); return;
  }
  if(a==="nova-consulta"){
    if(!confirm("Apagar todos os dados desta consulta? Não há como desfazer.")) return;
    try{ localStorage.removeItem("psiq-consulta-v1"); }catch(e){}
    location.reload(); return;
  }
});

function baixar(txt,nome){
  try{
    var blob=new Blob([txt],{type:"text/plain;charset=utf-8"});
    var url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=nome; document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); },100);
    A.toast("Arquivo gerado");
  }catch(e){ A.copiar(txt); A.toast("Download bloqueado — texto copiado"); }
}
function atualizarDx(c){
  var est = A.dxEstado(c);
  est.blocos.forEach(function(x,bi){
    var sp = el('[data-dxtag="'+c.id+'-'+bi+'"]');
    if(sp){ sp.className = 'tag '+(x.ok?'ok':'warn'); sp.textContent = A.dxTagTexto(x, c.blocos[bi]); }
  });
  var bd = el('[data-dxboard="'+c.id+'"]'); if(bd) bd.innerHTML = A.dxBoardHTML(c);
  var sm = el('details[data-dxcard="'+c.id+'"] > summary');
  if(sm){
    var marca = sm.querySelector('[data-dxok]');
    if(est.ok && !marca){ sm.insertAdjacentHTML('beforeend','<span class="tag ok" data-dxok="1">preenchido</span>'); }
    else if(!est.ok && marca){ marca.remove(); }
  }
}
function escalaById(id){ return E.filter(function(e){ return e.id===id; })[0]; }
function critById(id){ return C.filter(function(c){ return c.id===id; })[0]; }
function drugByName(n){ return F.filter(function(d){ return d.n===n; })[0]; }
function atualizarFarmacos(){
  var q=A.slug(S.farmBusca||""), cl=S.farmClasse||"";
  var lista=F.filter(function(d){
    if(cl && d.c!==cl) return false;
    if(!q) return true;
    return A.slug(d.n+" "+d.c+" "+(d.ind||[]).join(" ")+" "+(d.bz||"")).indexOf(q)>=0; });
  var box=document.getElementById("farm-lista"); if(!box) return;
  box.innerHTML = lista.length? lista.map(function(d){
    return '<details class="drug"><summary><div class="drug-line"><span class="drug-name">'+esc(d.n)+'</span>'+
      '<span class="drug-cls">'+esc(d.c)+'</span></div>'+
      '<div class="drug-line"><span class="drug-dose">'+esc(d.alvo)+'</span>'+A.tagRx(d.rx)+'</div></summary>'+
      drugBody(d)+'</details>'; }).join("") : '<p class="empty">Nada encontrado. Tente outro termo.</p>';
}
function atualizarRx(i){
  var card=el('[data-rxitem="'+i+'"]'); if(card){ var code=card.querySelector("code"); if(code) code.textContent=rxLinha(S.rx.itens[i]); }
  var out=document.getElementById("rx-out"); if(out) out.textContent=receitaTexto()||"— sem itens —";
}
function br(n){ return (Math.round(n*100)/100).toLocaleString("pt-BR",{maximumFractionDigits:2}); }
function calcPed(){
  var peso=parseFloat((el("#pd-peso")||{}).value), mgkg=parseFloat((el("#pd-mgkg")||{}).value),
      conc=parseFloat((el("#pd-conc")||{}).value), teto=parseFloat((el("#pd-teto")||{}).value);
  var out=document.getElementById("pd-out"); if(!out) return;
  if(!(peso>0)||!(mgkg>0)){ out.className="note info"; out.innerHTML="Informe peso e mg/kg."; return; }
  if(el("#pd-peso").value){ S.pac.peso=el("#pd-peso").value; A.save(); }
  var dose = peso*mgkg;
  var txt = "<b>Peso usado:</b> "+br(peso)+" kg · <b>Dose:</b> "+br(mgkg)+" mg/kg → <b>"+br(dose)+" mg</b>";
  if(conc>0) txt += " · <b>Volume:</b> "+br(dose/conc)+" mL (concentração "+br(conc)+" mg/mL)";
  var cls="note ok";
  if(teto>0){
    txt += " · <b>Teto informado:</b> "+br(teto)+" mg";
    if(dose>teto){ cls="note crit"; txt += "<br><b>ULTRAPASSA O TETO</b> — prescrever "+br(teto)+" mg"+(conc>0?" ("+br(teto/conc)+" mL)":"")+"."; }
  } else { cls="note warn"; txt += "<br>Teto máximo não informado — confira o limite do fármaco antes de prescrever."; }
  out.className=cls; out.innerHTML=txt;
}

/* ==================== INICIALIZAÇÃO ==================== */
try{ var tm=localStorage.getItem("psiq-tema"); if(tm) document.documentElement.setAttribute("data-theme",tm); }catch(e){}
render();
})();
