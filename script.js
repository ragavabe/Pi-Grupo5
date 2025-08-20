
const escapeHTML = (s) => s
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;");
  
const $texto = document.getElementById("texto");
const $saida = document.getElementById("saida");

const historyStack = [];
const redoStack = [];
function saveHistory(){
  historyStack.push($texto.value);
  if(historyStack.length > 100) historyStack.shift(); 
  redoStack.length = 0;
}

document.getElementById("btnColar").addEventListener("click", async () => {
  try{
    const clip = await navigator.clipboard.readText();
    insertAtCursor(clip);
  }catch{
    notify("Não foi possível ler a área de transferência.", "error");
  }
});

document.getElementById("btnCarregar").addEventListener("click", () => {
  document.getElementById("inputArquivo").click();
});
document.getElementById("inputArquivo").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  if(!file.name.endsWith(".txt")) { notify("Envie um arquivo .txt", "error"); return; }
  const reader = new FileReader();
  reader.onload = () => { $texto.value = (reader.result || "").toString(); saveHistory(); };
  reader.readAsText(file, "utf-8");
});

document.getElementById("btnNegrito").addEventListener("click", () => {
  wrapSelection("**","**"); 
  $texto.focus();
});

document.getElementById("selectFonte").addEventListener("change", (e) => {
  $texto.style.fontFamily = e.target.value;
});

document.getElementById("btnLink").addEventListener("click", () => {
  const url = prompt("Insira a URL (ex.: https://exemplo.com):");
  if(!url) return;
  const sel = getSelectionText();
  const textoLink = sel || "seu texto";
  replaceSelection(`[${textoLink}](${url})`);
});

document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnRedo").addEventListener("click", redo);
document.getElementById("btnLimpar").addEventListener("click", () => {
  $texto.value = "";
  saveHistory();
  $saida.classList.add("empty");
  $saida.innerHTML = "Ainda não há nada a verificar!<br>Cole um texto acima e clique em <span class='code'>Corrigir com IA</span>.";
});
document.getElementById("btnCorrigir").addEventListener("click", corrigirTexto);

$texto.addEventListener("input", saveHistory);
saveHistory();

const tabs = document.querySelectorAll(".tab");
let parsedResult = null; 
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  renderResultado(tab.dataset.tab);
}));

async function corrigirTexto(){
  const texto = $texto.value;
  if(texto.trim() === ""){
    $saida.classList.remove("empty");
    $saida.innerHTML = `<div class="alert">⚠️ Por favor, insira um texto para corrigir.</div>`;
    return;
  }

  setLoading(true, "Analisando com IA...");

  const prompt = [
    "Você é um corretor de português do Brasil. ",
    "Devolva um JSON com este formato EXATO:\n",
    `{
  "corrigido": "texto corrigido completo",
  "gramatica": ["ajuste 1", "ajuste 2"],
  "recomendacoes": ["sugestão 1", "sugestão 2"]
}\n`,
    "Evite markdown, não use crases, não adicione campos extras.",
    "\nTexto a corrigir:\n", texto
  ].join("");

  try{
    const resp = await fetch("http://localhost:3000/corrigir", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ texto: prompt })
});

    const raw = await resp.json();

    if(!resp.ok){
      const apiMsg = raw?.error?.message || "Erro desconhecido da API.";
      throw new Error(`${resp.status} ${resp.statusText} — ${apiMsg}`);
    }

    const textOut = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!textOut) throw new Error("Resposta da IA vazia.");

    const cleaned = textOut.trim().replace(/^```(?:json)?/i, "").replace(/```$/,"");
    let data;
    try{
      data = JSON.parse(cleaned);
    }catch{

      data = { corrigido: textOut, gramatica: [], recomendacoes: [] };
    }

    parsedResult = {
      original: texto,
      corrigido: data.corrigido || textOut,
      gramatica: Array.isArray(data.gramatica) ? data.gramatica : [],
      recomendacoes: Array.isArray(data.recomendacoes) ? data.recomendacoes : []
    };

    $saida.classList.remove("empty");
    renderResultado("todos");
  }catch(err){
    showError(err);
  }finally{
    setLoading(false);
  }
}

function renderResultado(tab){
  if(!parsedResult){
    $saida.classList.add("empty");
    $saida.innerHTML = "Ainda não há nada a verificar!";
    return;
  }

  const { original, corrigido, gramatica, recomendacoes } = parsedResult;

  const blocoOriginal = `
    <h3>Texto Original:</h3>
    <p>${escapeHTML(original).replaceAll("\n","<br>")}</p>
  `;

  const blocoCorrigido = `
    <h3>Texto Corrigido (IA):</h3>
    <div class="alert success">${escapeHTML(corrigido).replaceAll("\n","<br>")}</div>
  `;

  const blocoGram = `
    <h3>Ajustes de gramática:</h3>
    ${gramatica.length ? `<ul>${gramatica.map(li => `<li>${escapeHTML(li)}</li>`).join("")}</ul>` : `<div class="alert">Sem itens específicos.</div>`}
  `;

  const blocoRec = `
    <h3>Recomendações de estilo/semântica:</h3>
    ${recomendacoes.length ? `<ul>${recomendacoes.map(li => `<li>${escapeHTML(li)}</li>`).join("")}</ul>` : `<div class="alert">Sem recomendações adicionais.</div>`}
  `;

  $saida.classList.remove("empty");
  if(tab === "gramatica"){
    $saida.innerHTML = blocoOriginal + blocoGram;
  }else if(tab === "recomendacoes"){
    $saida.innerHTML = blocoOriginal + blocoRec;
  }else{
    $saida.innerHTML = blocoOriginal + blocoCorrigido + blocoGram + blocoRec;
  }
}

function showError(err){
  $saida.classList.remove("empty");
  const msg = (err && err.message) ? err.message : String(err);
  $saida.innerHTML = `
    <div class="alert error">
      <strong>❌ Erro ao corrigir:</strong><br>${escapeHTML(msg)}
    </div>
    <h3>Possíveis soluções</h3>
    <ul>
      <li>Confira se a <span class="code">SUA_CHAVE_API</span> está correta e ativa.</li>
      <li>Verifique se o endpoint <span class="code">gemini-pro:generateContent</span> está disponível para sua conta.</li>
      <li>Veja se não houve bloqueio por CORS (teste local com Live Server ou use backend).</li>
      <li>Cheque limites de uso/quota no Google AI Studio.</li>
    </ul>
  `;
}

function setLoading(isLoading, text=""){
  if(isLoading){
    $saida.classList.remove("empty");
    $saida.innerHTML = `<span class="loader"></span>${text || "Carregando..."}`;
  }
}

function notify(text, type="warn"){
  $saida.classList.remove("empty");
  const cls = type==="error" ? "alert error" : (type==="success" ? "alert success" : "alert");
  $saida.innerHTML = `<div class="${cls}">${escapeHTML(text)}</div>`;
}

function getSelectionText(){
  const start = $texto.selectionStart;
  const end = $texto.selectionEnd;
  return $texto.value.substring(start, end);
}
function replaceSelection(replacement){
  const start = $texto.selectionStart;
  const end = $texto.selectionEnd;
  const before = $texto.value.slice(0, start);
  const after  = $texto.value.slice(end);
  $texto.value = before + replacement + after;

  const pos = before.length + replacement.length;
  $texto.setSelectionRange(pos, pos);
  saveHistory();
}
function wrapSelection(prefix, suffix){
  const sel = getSelectionText();
  if(!sel){ return; }
  replaceSelection(prefix + sel + suffix);
}
function insertAtCursor(text){
  const start = $texto.selectionStart;
  const end = $texto.selectionEnd;
  const before = $texto.value.slice(0, start);
  const after  = $texto.value.slice(end);
  $texto.value = before + text + after;
  const pos = before.length + text.length;
  $texto.setSelectionRange(pos, pos);
  saveHistory();
}

function undo(){
  if(historyStack.length <= 1) return;
  const current = historyStack.pop(); 
  redoStack.push(current);
  $texto.value = historyStack[historyStack.length-1] || "";
}
function redo(){
  if(!redoStack.length) return;
  const next = redoStack.pop();
  historyStack.push(next);
  $texto.value = next;
}
document.getElementById("btnSalvar").addEventListener("click", () => {
    const textoCorrigido = parsedResult?.corrigido || "";
    const blob = new Blob([textoCorrigido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'texto_corrigido.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
