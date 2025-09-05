let annotations = []
let current = 0
let edited = {}

async function load(){
  const res = await fetch('/api/annotations')
  annotations = await res.json()
  renderList()
  show(0)
}

function renderList(){
  const ul = document.getElementById('doc-list')
  ul.innerHTML = ''
  annotations.forEach((a, i)=>{
    const li = document.createElement('li')
    li.textContent = `#${a.id} ${a.text.slice(0,80)}...`
    li.addEventListener('click', ()=> show(i))
    li.className = i===current? 'active':''
    ul.appendChild(li)
  })
}

function highlightText(text, cues, scopes){
  // build array of tags
  const tags = []
  cues.forEach(c=> tags.push({start:c.start,end:c.end,type:'cue',meta:c}))
  scopes.forEach((s, idx)=> tags.push({start:s.start,end:s.end,type:'scope',meta:{...s,idx}}))
  tags.sort((a,b)=> a.start - b.start || b.end - a.end)
  let out = ''
  let pos = 0
  for(const t of tags){
    if(t.start>pos) out += escapeHTML(text.slice(pos,t.start))
    const seg = escapeHTML(text.slice(t.start,t.end))
    if(t.type==='cue') out += `<span class="cue" data-start="${t.start}" data-end="${t.end}">${seg}</span>`
    else out += `<span class="scope" data-start="${t.start}" data-end="${t.end}" data-idx="${t.meta.idx}">${seg}</span>`
    pos = t.end
  }
  if(pos<text.length) out += escapeHTML(text.slice(pos))
  return out
}

function escapeHTML(s){ return s.replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]) }

function show(i){
  if(i<0||i>=annotations.length) return
  current = i
  edited[current] = edited[current] || JSON.parse(JSON.stringify(annotations[current]))
  renderList()
  const doc = edited[current]
  document.getElementById('doc-counter').textContent = `${current+1}/${annotations.length}`
  document.getElementById('cues').innerHTML = ''
  (doc.cues||[]).forEach((c,idx)=>{
    const li = document.createElement('li')
    li.className='item'
    li.innerHTML = `<div><strong>${c.cue_label}</strong> <span class="meta">[${c.start}-${c.end}] ${c.group}</span></div>`
    const btn = document.createElement('button'); btn.textContent='Delete'; btn.addEventListener('click', ()=>{
      doc.cues.splice(idx,1); show(current)
    })
    li.appendChild(btn)
    document.getElementById('cues').appendChild(li)
  })
  // scopes
  document.getElementById('scopes').innerHTML = ''
  (doc.scopes||[]).forEach((s,idx)=>{
    const li = document.createElement('li')
    li.className='item'
    li.innerHTML = `<div><strong>${doc.text.slice(s.start,s.end)}</strong> <span class="meta">[${s.start}-${s.end}]</span></div>`
    const del = document.createElement('button'); del.textContent='Delete'; del.addEventListener('click', ()=>{ doc.scopes.splice(idx,1); show(current) })
    li.appendChild(del)
    document.getElementById('scopes').appendChild(li)
  })
  // text view with highlights
  document.getElementById('text-view').innerHTML = highlightText(doc.text, doc.cues||[], doc.scopes||[])
}

document.getElementById('prev').addEventListener('click', ()=> show(current-1))
document.getElementById('next').addEventListener('click', ()=> show(current+1))

document.getElementById('add-scope').addEventListener('click', ()=>{
  const s = parseInt(document.getElementById('scope-start').value||'0',10)
  const e = parseInt(document.getElementById('scope-end').value||'0',10)
  if(isNaN(s)||isNaN(e)||s<0||e<=s) return alert('Invalid span')
  edited[current].scopes.push({start:s,end:e})
  show(current)
})

document.getElementById('save').addEventListener('click', async ()=>{
  const payload = edited[current]
  const res = await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)})
  const j = await res.json()
  alert('Saved: '+ JSON.stringify(j))
})

document.getElementById('save-batch').addEventListener('click', async ()=>{
  const toSave = Object.values(edited)
  const res = await fetch('/api/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(toSave)})
  const j = await res.json()
  alert('Saved: '+ JSON.stringify(j))
})

document.getElementById('reset').addEventListener('click', ()=>{ delete edited[current]; show(current) })

window.addEventListener('load', load)
