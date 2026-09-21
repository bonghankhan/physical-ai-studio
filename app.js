const state = {
  classes: [
    { id: crypto.randomUUID(), name: 'Class A', samples: [] },
    { id: crypto.randomUUID(), name: 'Class B', samples: [] }
  ],
  activeClassId: null,
  mobileNet: null,
  classifier: null,
  trained: false,
  serialPort: null,
  serialWriter: null,
  serialReader: null,
  keepReading: false
};
state.activeClassId = state.classes[0].id;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2400);
}

function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('is-visible', v.id === `view-${name}`));
  $$('.nav-link').forEach(b => b.classList.toggle('is-active', b.dataset.view === name));
  $('.main-nav').classList.remove('is-open');
  if (name === 'data') renderDataLab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.nav-link').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
$$('[data-go]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.go)));
$('#mobileMenu').addEventListener('click', () => $('.main-nav').classList.toggle('is-open'));

function renderClasses() {
  const list = $('#classList');
  list.innerHTML = state.classes.map(c => `
    <div class="class-item ${c.id === state.activeClassId ? 'is-active' : ''}" data-class-id="${c.id}">
      <div class="class-meta"><i class="class-dot"></i><div><b>${escapeHtml(c.name)}</b><span>${c.samples.length} images</span></div></div>
      ${state.classes.length > 2 ? `<button class="small-btn remove-class" data-remove="${c.id}" aria-label="${escapeHtml(c.name)} 삭제">×</button>` : ''}
    </div>`).join('');
  $$('.class-item').forEach(item => item.addEventListener('click', e => {
    if (e.target.closest('[data-remove]')) return;
    state.activeClassId = item.dataset.classId;
    renderAll();
  }));
  $$('[data-remove]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.remove;
    const target = state.classes.find(c => c.id === id);
    target?.samples.forEach(s => URL.revokeObjectURL(s.url));
    state.classes = state.classes.filter(c => c.id !== id);
    if (state.activeClassId === id) state.activeClassId = state.classes[0].id;
    state.trained = false;
    renderAll();
  }));
}

function renderSamples() {
  const grid = $('#sampleGrid');
  const active = state.classes.find(c => c.id === state.activeClassId);
  if (!active || !active.samples.length) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = active.samples.map(s => `<div class="sample-thumb"><img src="${s.url}" alt="${escapeHtml(active.name)} 학습 이미지" /><span>${escapeHtml(s.name)}</span></div>`).join('');
}

function renderMetrics() {
  const total = state.classes.reduce((sum, c) => sum + c.samples.length, 0);
  $('#totalSamples').textContent = total;
  $('#totalClasses').textContent = state.classes.length;
  $('#statSamples').textContent = total;
  $('#statClasses').textContent = state.classes.length;
}

function renderAll() {
  renderClasses();
  renderSamples();
  renderMetrics();
}

$('#addClassBtn').addEventListener('click', () => {
  const raw = prompt('새 클래스 이름을 입력하세요.', `Class ${String.fromCharCode(65 + state.classes.length)}`);
  const name = raw?.trim();
  if (!name) return;
  if (state.classes.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast('같은 이름의 클래스가 있습니다.');
  const newClass = { id: crypto.randomUUID(), name: name.slice(0, 30), samples: [] };
  state.classes.push(newClass);
  state.activeClassId = newClass.id;
  state.trained = false;
  renderAll();
});

async function addFiles(files) {
  const active = state.classes.find(c => c.id === state.activeClassId);
  if (!active) return;
  const imageFiles = [...files].filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) return toast('이미지 파일을 선택해주세요.');
  for (const file of imageFiles.slice(0, 50)) {
    active.samples.push({ id: crypto.randomUUID(), name: file.name, file, url: URL.createObjectURL(file) });
  }
  state.trained = false;
  $('#modelStatus').textContent = '재학습 필요';
  renderAll();
  toast(`${imageFiles.length}개 이미지를 ${active.name}에 추가했습니다.`);
}

$('#sampleInput').addEventListener('change', e => { addFiles(e.target.files); e.target.value=''; });
const dz = $('#dropzone');
['dragenter','dragover'].forEach(type => dz.addEventListener(type, e => { e.preventDefault(); dz.classList.add('is-dragover'); }));
['dragleave','drop'].forEach(type => dz.addEventListener(type, e => { e.preventDefault(); dz.classList.remove('is-dragover'); }));
dz.addEventListener('drop', e => addFiles(e.dataTransfer.files));
dz.addEventListener('click', () => $('#sampleInput').click());
dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') $('#sampleInput').click(); });

function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function ensureModel() {
  if (!window.tf || !window.mobilenet || !window.knnClassifier) throw new Error('AI 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.');
  if (!state.mobileNet) {
    $('#modelStatus').textContent = 'MobileNet 로딩 중…';
    state.mobileNet = await mobilenet.load({ version: 2, alpha: 1.0 });
  }
  state.classifier = knnClassifier.create();
}

$('#trainBtn').addEventListener('click', async () => {
  const valid = state.classes.filter(c => c.samples.length >= 2);
  if (valid.length < 2) return toast('최소 2개 클래스에 각각 2장 이상의 이미지가 필요합니다.');
  const btn = $('#trainBtn');
  btn.disabled = true;
  btn.textContent = '학습 중…';
  try {
    await ensureModel();
    let done = 0;
    const total = valid.reduce((sum, c) => sum + c.samples.length, 0);
    for (const c of valid) {
      for (const sample of c.samples) {
        const img = await imageFromUrl(sample.url);
        const activation = state.mobileNet.infer(img, true);
        state.classifier.addExample(activation, c.name);
        activation.dispose();
        done++;
        btn.textContent = `학습 중… ${done}/${total}`;
      }
    }
    state.trained = true;
    $('#modelStatus').textContent = '모델 준비 완료';
    toast('AI 모델 학습이 완료되었습니다.');
  } catch (error) {
    console.error(error);
    $('#modelStatus').textContent = '학습 오류';
    toast(error.message || '모델 학습 중 오류가 발생했습니다.');
  } finally {
    btn.disabled = false;
    btn.textContent = '모델 학습하기';
  }
});

$('#predictInput').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  $('#predictPreview').innerHTML = `<img src="${url}" alt="테스트 이미지" />`;
  if (!state.trained || !state.classifier) {
    $('#predictionResult').innerHTML = '<div class="prediction-empty">먼저 모델을 학습해주세요.</div>';
    return;
  }
  try {
    const img = await imageFromUrl(url);
    const activation = state.mobileNet.infer(img, true);
    const result = await state.classifier.predictClass(activation, 3);
    activation.dispose();
    const entries = Object.entries(result.confidences).sort((a,b) => b[1]-a[1]);
    const [topName, topScore] = entries[0];
    $('#predictionResult').innerHTML = `
      <div class="prediction-top"><small>가장 가까운 클래스</small><strong>${escapeHtml(topName)}</strong><b>${(topScore*100).toFixed(1)}%</b></div>
      ${entries.map(([name, score]) => `<div class="prob-row"><span>${escapeHtml(name)}</span><div class="prob-track"><div class="prob-fill" style="width:${Math.max(2,score*100)}%"></div></div><b>${(score*100).toFixed(1)}%</b></div>`).join('')}`;
  } catch (error) {
    console.error(error);
    toast('예측 중 오류가 발생했습니다.');
  }
});

function renderDataLab() {
  const counts = state.classes.map(c => c.samples.length);
  const total = counts.reduce((a,b) => a+b, 0);
  const max = Math.max(1, ...counts);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 0;
  $('#statSamples').textContent = total;
  $('#statClasses').textContent = state.classes.length;
  $('#statMin').textContent = minCount;
  $('#statMax').textContent = maxCount;
  $('#dataBars').innerHTML = state.classes.map(c => `<div class="data-row"><label>${escapeHtml(c.name)}</label><div class="data-track"><div class="data-fill" style="width:${(c.samples.length/max)*100}%"></div></div><b>${c.samples.length}</b></div>`).join('');
  const badge = $('#balanceBadge');
  if (!total) { badge.textContent='데이터 없음'; return; }
  const nonZero = counts.filter(Boolean);
  const ratio = nonZero.length ? Math.min(...nonZero) / Math.max(...nonZero) : 0;
  badge.textContent = ratio >= .75 && nonZero.length === counts.length ? '균형 좋음' : ratio >= .5 ? '균형 보통' : '균형 점검 필요';
}

$('#clearDataBtn').addEventListener('click', () => {
  if (!confirm('현재 세션의 모든 학습 이미지를 지울까요?')) return;
  state.classes.forEach(c => { c.samples.forEach(s => URL.revokeObjectURL(s.url)); c.samples = []; });
  state.trained = false;
  state.classifier?.clearAllClasses();
  $('#modelStatus').textContent = '모델 준비 전';
  $('#predictionResult').innerHTML = '<div class="prediction-empty">학습 후 테스트 이미지를 넣으면 결과가 표시됩니다.</div>';
  $('#predictPreview').innerHTML = '<span>테스트 이미지를 선택하세요.</span>';
  renderAll(); renderDataLab(); toast('학습 데이터를 초기화했습니다.');
});

function terminalLog(message, type='info') {
  const t = $('#terminal');
  const time = new Date().toLocaleTimeString('ko-KR', {hour12:false});
  t.textContent += `\n[${time}] ${type === 'rx' ? '←' : type === 'tx' ? '→' : '·'} ${message}`;
  t.scrollTop = t.scrollHeight;
}

async function readSerialLoop() {
  const decoder = new TextDecoderStream();
  const readableClosed = state.serialPort.readable.pipeTo(decoder.writable);
  state.serialReader = decoder.readable.getReader();
  state.keepReading = true;
  try {
    while (state.keepReading) {
      const { value, done } = await state.serialReader.read();
      if (done) break;
      if (value) terminalLog(value.trimEnd(), 'rx');
    }
  } catch (e) {
    if (state.keepReading) terminalLog(`read error: ${e.message}`);
  } finally {
    state.serialReader?.releaseLock();
    state.serialReader = null;
    await readableClosed.catch(() => {});
  }
}

$('#connectSerial').addEventListener('click', async () => {
  if (!('serial' in navigator)) return toast('이 브라우저는 Web Serial을 지원하지 않습니다. Chrome/Edge를 사용하세요.');
  try {
    state.serialPort = await navigator.serial.requestPort();
    await state.serialPort.open({ baudRate: Number($('#baudRate').value) });
    state.serialWriter = state.serialPort.writable.getWriter();
    $('#deviceStatus').textContent = '연결됨';
    terminalLog(`connected @ ${$('#baudRate').value} baud`);
    readSerialLoop();
  } catch (e) {
    terminalLog(`connection failed: ${e.message}`);
    toast('장치 연결을 완료하지 못했습니다.');
  }
});

async function disconnectSerial() {
  try {
    state.keepReading = false;
    if (state.serialReader) await state.serialReader.cancel().catch(() => {});
    if (state.serialWriter) { state.serialWriter.releaseLock(); state.serialWriter = null; }
    if (state.serialPort) { await state.serialPort.close(); state.serialPort = null; }
    $('#deviceStatus').textContent = '연결 안 됨';
    terminalLog('disconnected');
  } catch (e) { terminalLog(`disconnect error: ${e.message}`); }
}
$('#disconnectSerial').addEventListener('click', disconnectSerial);

async function sendSerial(command) {
  const cleaned = command.trim();
  if (!cleaned) return;
  if (!state.serialWriter) return toast('먼저 장치를 연결하세요.');
  try {
    const data = new TextEncoder().encode(cleaned + '\n');
    await state.serialWriter.write(data);
    terminalLog(cleaned, 'tx');
  } catch (e) { terminalLog(`send error: ${e.message}`); }
}

$$('[data-command]').forEach(btn => btn.addEventListener('click', () => sendSerial(btn.dataset.command)));
$('#sendCommand').addEventListener('click', () => { sendSerial($('#customCommand').value); $('#customCommand').value=''; });
$('#customCommand').addEventListener('keydown', e => { if (e.key === 'Enter') $('#sendCommand').click(); });
$('#clearTerminal').addEventListener('click', () => $('#terminal').textContent='[ready] console cleared.');

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
renderAll();
