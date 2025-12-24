// js/highscores.js
// Simple top-5 local high-score manager with 3-character initials input
(function(window){
  const STORAGE_KEY = 'skunkfu_highscores_v1';
  const MAX_SCORES = 5;

  function loadScores(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch(e){ return []; }
  }

  function saveScores(scores){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scores)); }
    catch(e){ console.warn('Failed to save highscores', e); }
  }

  function isHighScore(score){
    if (typeof score !== 'number') return false;
    const scores = loadScores();
    if (scores.length < MAX_SCORES) return true;
    return score > scores[scores.length - 1].score;
  }

  function addScore(score, initials){
    const entry = {
      score: Math.floor(score),
      initials: String(initials || '').toUpperCase().slice(0,3),
      date: Date.now()
    };
    const scores = loadScores();
    scores.push(entry);
    scores.sort((a,b)=>b.score - a.score || a.date - b.date);
    const top = scores.slice(0, MAX_SCORES);
    saveScores(top);
    return top;
  }

  function promptForInitials(score, onDone){
    try {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = 0; overlay.style.top = 0; overlay.style.right = 0; overlay.style.bottom = 0;
      overlay.style.background = 'rgba(0,0,0,0.75)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = 9999;

      const box = document.createElement('div');
      box.style.background = '#111';
      box.style.color = '#fff';
      box.style.padding = '18px';
      box.style.borderRadius = '8px';
      box.style.textAlign = 'center';
      box.style.minWidth = '260px';
      box.style.fontFamily = 'sans-serif';

      const title = document.createElement('div');
      title.textContent = 'New High Score!';
      title.style.fontSize = '18px';
      title.style.marginBottom = '8px';

      const scoreLine = document.createElement('div');
      scoreLine.textContent = `Score: ${score}`;
      scoreLine.style.marginBottom = '12px';

      const input = document.createElement('input');
      input.maxLength = 3;
      input.value = '';
      input.placeholder = 'AAA';
      input.style.textTransform = 'uppercase';
      input.style.fontSize = '20px';
      input.style.width = '120px';
      input.style.textAlign = 'center';
      input.style.letterSpacing = '4px';
      input.style.padding = '6px';

      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
      });

      const btnRow = document.createElement('div');
      btnRow.style.marginTop = '12px';
      btnRow.style.display = 'flex';
      btnRow.style.justifyContent = 'center';
      btnRow.style.gap = '8px';

      const ok = document.createElement('button');
      ok.textContent = 'Save';
      ok.style.padding = '6px 12px';
      ok.onclick = async () => {
        const initials = (input.value || '---').slice(0,3);
        const updated = addScore(score, initials);
        // Show quick submitting feedback
        const status = document.createElement('div'); status.style.marginTop = '8px'; status.style.fontSize = '12px'; status.style.color = '#cfe'; status.textContent = 'Submitting...';
        box.appendChild(status);
        try { document.body.removeChild(overlay); } catch(e) {}
        // Attempt to submit to serverless leaderboard (best-effort)
        try {
          if (window.Highscores && typeof Highscores.submitToServer === 'function') {
            const resp = await Highscores.submitToServer(score, initials);
            if (resp && resp.ok) {
              console.log('Submitted highscore to server', resp);
              status.textContent = 'Submitted ✓';
              setTimeout(()=> { try { status.remove(); } catch(e){} }, 1200);
            } else if (resp && resp.error) {
              status.textContent = `Submit failed: ${resp.error}`;
              console.warn('submit response error', resp);
              // keep the status visible so user can retry later
            } else if (resp && resp.status === 429) {
              status.textContent = 'Rate limited — try again later';
            } else {
              status.textContent = 'Submit failed — will retry later';
            }
          }
        } catch (e) { console.warn('submit attempt failed', e); }
        if (onDone) onDone(updated);
      };

      const skip = document.createElement('button');
      skip.textContent = 'Skip';
      skip.style.padding = '6px 12px';
      skip.onclick = () => {
        try { document.body.removeChild(overlay); } catch(e) {}
        if (onDone) onDone(loadScores());
      };

      input.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter') ok.click();
        if (e.key === 'Escape') skip.click();
      });

      btnRow.appendChild(ok);
      btnRow.appendChild(skip);

      box.appendChild(title);
      box.appendChild(scoreLine);
      box.appendChild(input);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      input.focus();
    } catch (e) {
      console.warn('promptForInitials failed', e);
      if (onDone) onDone(loadScores());
    }
  }

  function renderScoreboard(target){
    const scores = loadScores();
    const container = target || document.createElement('div');
    container.innerHTML = '';
    container.style.fontFamily = 'sans-serif';
    container.style.color = '#fff';
    const title = document.createElement('h3');
    title.textContent = 'High Scores';
    title.style.margin = '8px 0 12px 0';
    container.appendChild(title);

    const list = document.createElement('ol');
    list.style.paddingLeft = '18px';
    list.style.color = '#ffd';
    for (let i=0;i<MAX_SCORES;i++){
      const li = document.createElement('li');
      if (scores[i]) {
        li.textContent = `${scores[i].initials.padEnd(3,' ')} — ${scores[i].score}`;
      } else {
        li.textContent = '--- — 0';
        li.style.opacity = 0.5;
      }
      list.appendChild(li);
    }
    container.appendChild(list);
    return container;
  }

  window.Highscores = {
    loadScores,
    saveScores,
    isHighScore,
    addScore,
    promptForInitials,
    renderScoreboard,
    // Submit to serverless endpoint (Netlify) if available
    async submitToServer(score, initials) {
      try {
        // If reCAPTCHA site key is provided on the global, request a token
        let recaptchaToken = null;
        try {
          const siteKey = window.RECAPTCHA_SITE_KEY;
          if (siteKey) {
            if (typeof grecaptcha === 'undefined') {
              await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
              });
            }
            await grecaptcha.ready(async () => {
              try { recaptchaToken = await grecaptcha.execute(siteKey, { action: 'submit_score' }); } catch (e) { recaptchaToken = null; }
            });
          }
        } catch (e) { console.warn('recaptcha client fail', e); }

        const payload = { score: Math.floor(score), initials: String(initials).toUpperCase().slice(0,3) };
        if (recaptchaToken) payload.recaptchaToken = recaptchaToken;

        const res = await fetch('/.netlify/functions/submit-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text();
          console.warn('submitToServer failed', res.status, txt);
          return { ok: false, status: res.status, text: txt };
        }
        const json = await res.json();
        return json;
      } catch (e) { console.warn('submitToServer error', e); return null; }
    },
    async fetchFromServer() {
      try {
        const res = await fetch('/.netlify/functions/get-leaderboard');
        if (!res.ok) return null;
        return await res.json();
      } catch (e) { return null; }
    },
    MAX_SCORES
  };

})(window);
