// js/highscores.js
// Enhanced local high-score manager with sharing and validation
(function(window){
  const STORAGE_KEY = 'skunkfu_highscores_v1';
  const ACHIEVEMENTS_KEY = 'skunkfu_achievements_v1';
  const MAX_SCORES = 10; // Increased from 5 to 10

  // Score validation: prevent obviously tampered scores
  function validateScore(score, gameStats) {
    if (typeof score !== 'number' || score < 0 || !isFinite(score)) return false;
    if (score > 1000000) return false; // Reasonable max
    
    // Basic sanity checks on game stats
    if (gameStats) {
      if (gameStats.timeSurvived && score > gameStats.timeSurvived * 1000) return false; // Max ~1000 pts/sec
      if (gameStats.enemiesDefeated && score < gameStats.enemiesDefeated * 50) return false; // Min 50 pts/enemy
    }
    return true;
  }

  // Generate shareable score code (base64 encoded)
  function encodeScore(score, initials, gameStats = {}) {
    const data = {
      s: Math.floor(score),
      i: String(initials || '???').toUpperCase().slice(0, 3),
      t: gameStats.timeSurvived || 0,
      e: gameStats.enemiesDefeated || 0,
      c: gameStats.maxCombo || 0,
      d: Date.now()
    };
    try {
      const json = JSON.stringify(data);
      return btoa(json).replace(/=/g, '');
    } catch (e) {
      return null;
    }
  }

  // Decode shareable score code
  function decodeScore(code) {
    try {
      const padding = (4 - (code.length % 4)) % 4;
      const base64 = code + '='.repeat(padding);
      const json = atob(base64);
      const data = JSON.parse(json);
      return {
        score: data.s,
        initials: data.i,
        timeSurvived: data.t,
        enemiesDefeated: data.e,
        maxCombo: data.c,
        date: data.d
      };
    } catch (e) {
      return null;
    }
  }

  // Cross-tab synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        // Dispatch event to update UI when scores change in another tab
        window.dispatchEvent(new CustomEvent('highscoresUpdated', {
          detail: { scores: JSON.parse(e.newValue) }
        }));
      } catch (err) {}
    }
  });

  function loadScores(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const scores = JSON.parse(raw);
      return Array.isArray(scores) ? scores : [];
    } catch(e){ 
      console.warn('Failed to load highscores', e);
      return []; 
    }
  }

  function loadAchievements(){
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  }

  function saveAchievements(achievements){
    try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements)); }
    catch(e){ console.warn('Failed to save achievements', e); }
  }

  function checkAchievements(gameStats) {
    const achievements = loadAchievements();
    const newAchievements = [];

    // Define achievement checks
    const checks = [
      { id: 'first_kill', name: 'First Blood', desc: 'Defeat your first enemy', check: () => gameStats.enemiesDefeated >= 1 },
      { id: 'enemy_slayer', name: 'Enemy Slayer', desc: 'Defeat 10 enemies', check: () => gameStats.enemiesDefeated >= 10 },
      { id: 'combo_master', name: 'Combo Master', desc: 'Achieve a 3-hit combo', check: () => gameStats.maxCombo >= 3 },
      { id: 'speed_demon', name: 'Speed Demon', desc: 'Survive for 2 minutes', check: () => gameStats.timeSurvived >= 120 },
      { id: 'marksman', name: 'Marksman', desc: 'Achieve 80% accuracy', check: () => gameStats.accuracy >= 0.8 },
      { id: 'high_scorer', name: 'High Scorer', desc: 'Score over 10,000 points', check: () => gameStats.score >= 10000 }
    ];

    for (const achievement of checks) {
      if (!achievements[achievement.id] && achievement.check()) {
        achievements[achievement.id] = { unlocked: true, date: Date.now() };
        newAchievements.push(achievement);
      }
    }

    if (newAchievements.length > 0) {
      saveAchievements(achievements);
    }

    return newAchievements;
  }

  function renderAchievements(target){
    const achievements = loadAchievements();
    const container = target || document.createElement('div');
    container.innerHTML = '';
    container.style.fontFamily = 'sans-serif';
    container.style.color = '#fff';
    container.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e)';
    container.style.padding = '20px';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    container.style.minWidth = '300px';

    const title = document.createElement('h3');
    title.textContent = '🏆 ACHIEVEMENTS';
    title.style.margin = '0 0 16px 0';
    title.style.color = '#ffd700';
    title.style.fontSize = '24px';
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const achievementList = [
      { id: 'first_kill', name: 'First Blood', desc: 'Defeat your first enemy', icon: '🩸' },
      { id: 'enemy_slayer', name: 'Enemy Slayer', desc: 'Defeat 10 enemies', icon: '⚔️' },
      { id: 'combo_master', name: 'Combo Master', desc: 'Achieve a 3-hit combo', icon: '🔥' },
      { id: 'speed_demon', name: 'Speed Demon', desc: 'Survive for 2 minutes', icon: '💨' },
      { id: 'marksman', name: 'Marksman', desc: 'Achieve 80% accuracy', icon: '🎯' },
      { id: 'high_scorer', name: 'High Scorer', desc: 'Score over 10,000 points', icon: '💎' }
    ];

    for (const ach of achievementList) {
      const entry = document.createElement('div');
      entry.style.display = 'flex';
      entry.style.alignItems = 'center';
      entry.style.padding = '12px';
      entry.style.marginBottom = '8px';
      entry.style.borderRadius = '8px';
      entry.style.background = achievements[ach.id] ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      entry.style.border = achievements[ach.id] ? '1px solid #4CAF50' : '1px solid rgba(255, 255, 255, 0.1)';

      const icon = document.createElement('div');
      icon.textContent = ach.icon;
      icon.style.fontSize = '24px';
      icon.style.width = '40px';
      icon.style.textAlign = 'center';
      icon.style.opacity = achievements[ach.id] ? '1' : '0.3';

      const info = document.createElement('div');
      info.style.flex = '1';

      const name = document.createElement('div');
      name.style.fontSize = '16px';
      name.style.fontWeight = 'bold';
      name.style.color = achievements[ach.id] ? '#4CAF50' : '#ccc';
      name.textContent = ach.name;

      const desc = document.createElement('div');
      desc.style.fontSize = '12px';
      desc.style.opacity = '0.8';
      desc.textContent = ach.desc;

      info.appendChild(name);
      info.appendChild(desc);

      const status = document.createElement('div');
      status.textContent = achievements[ach.id] ? '✓' : '🔒';
      status.style.fontSize = '18px';
      status.style.color = achievements[ach.id] ? '#4CAF50' : '#666';

      entry.appendChild(icon);
      entry.appendChild(info);
      entry.appendChild(status);
      container.appendChild(entry);
    }

    return container;
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

  function addScore(score, initials, gameStats = {}) {
    // Validate before adding
    if (!validateScore(score, gameStats)) {
      console.warn('Invalid score rejected', score);
      return loadScores();
    }

    const entry = {
      score: Math.floor(score),
      initials: String(initials || '???').toUpperCase().slice(0,3),
      date: Date.now(),
      // Enhanced stats
      timeSurvived: gameStats.timeSurvived || 0,
      enemiesDefeated: gameStats.enemiesDefeated || 0,
      maxCombo: gameStats.maxCombo || 0,
      totalDamage: gameStats.totalDamage || 0,
      accuracy: gameStats.accuracy || 0,
      gameVersion: gameStats.gameVersion || '1.0',
      // Add shareable code
      shareCode: encodeScore(score, initials, gameStats)
    };
    const scores = loadScores();
    scores.push(entry);
    scores.sort((a,b)=>b.score - a.score || a.date - b.date);
    const top = scores.slice(0, MAX_SCORES);
    saveScores(top);
    
    // Notify other tabs
    window.dispatchEvent(new CustomEvent('highscoresUpdated', {
      detail: { scores: top }
    }));
    
    return top;
  }

  // Import score from shareable code
  function importScoreCode(code) {
    const decoded = decodeScore(code);
    if (!decoded) return { success: false, error: 'Invalid code' };
    
    if (!validateScore(decoded.score, decoded)) {
      return { success: false, error: 'Invalid score data' };
    }

    const scores = loadScores();
    // Check if this exact score already exists
    const exists = scores.some(s => 
      s.score === decoded.score && 
      s.initials === decoded.initials && 
      Math.abs(s.date - decoded.date) < 1000
    );
    
    if (exists) {
      return { success: false, error: 'Score already imported' };
    }

    scores.push(decoded);
    scores.sort((a,b)=>b.score - a.score || a.date - b.date);
    const top = scores.slice(0, MAX_SCORES);
    saveScores(top);
    
    return { success: true, scores: top };
  }

  function promptForInitials(score, gameStats, onDone){
    try {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = 0; overlay.style.top = 0; overlay.style.right = 0; overlay.style.bottom = 0;
      overlay.style.background = 'rgba(0,0,0,0.85)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = 9999;

      const box = document.createElement('div');
      box.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e)';
      box.style.color = '#fff';
      box.style.padding = '24px';
      box.style.borderRadius = '12px';
      box.style.textAlign = 'center';
      box.style.minWidth = '320px';
      box.style.fontFamily = 'sans-serif';
      box.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
      box.style.border = '2px solid #ffd700';

      const title = document.createElement('div');
      title.textContent = '🏆 NEW HIGH SCORE!';
      title.style.fontSize = '20px';
      title.style.marginBottom = '12px';
      title.style.fontWeight = 'bold';
      title.style.color = '#ffd700';

      const scoreLine = document.createElement('div');
      scoreLine.textContent = `Score: ${score.toLocaleString()}`;
      scoreLine.style.fontSize = '24px';
      scoreLine.style.marginBottom = '8px';
      scoreLine.style.fontWeight = 'bold';

      // Show game stats if available
      const statsDiv = document.createElement('div');
      statsDiv.style.fontSize = '14px';
      statsDiv.style.marginBottom = '16px';
      statsDiv.style.opacity = '0.9';
      if (gameStats && Object.keys(gameStats).length > 0) {
        const stats = [];
        if (gameStats.timeSurvived) stats.push(`Time: ${Math.floor(gameStats.timeSurvived)}s`);
        if (gameStats.enemiesDefeated) stats.push(`Enemies: ${gameStats.enemiesDefeated}`);
        if (gameStats.maxCombo) stats.push(`Max Combo: ${gameStats.maxCombo}`);
        if (gameStats.accuracy && gameStats.accuracy > 0) stats.push(`Accuracy: ${Math.round(gameStats.accuracy * 100)}%`);
        statsDiv.textContent = stats.join(' • ');
      }

      const input = document.createElement('input');
      input.maxLength = 3;
      input.value = '';
      input.placeholder = 'AAA';
      input.style.textTransform = 'uppercase';
      input.style.fontSize = '22px';
      input.style.width = '140px';
      input.style.textAlign = 'center';
      input.style.letterSpacing = '6px';
      input.style.padding = '8px 12px';
      input.style.border = '2px solid #666';
      input.style.borderRadius = '6px';
      input.style.background = '#333';
      input.style.color = '#fff';
      input.style.outline = 'none';

      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
        input.style.borderColor = input.value.length === 3 ? '#4CAF50' : '#666';
      });

      const btnRow = document.createElement('div');
      btnRow.style.marginTop = '16px';
      btnRow.style.display = 'flex';
      btnRow.style.justifyContent = 'center';
      btnRow.style.gap = '12px';

      const ok = document.createElement('button');
      ok.textContent = '💾 SAVE';
      ok.style.padding = '8px 16px';
      ok.style.borderRadius = '6px';
      ok.style.border = 'none';
      ok.style.background = '#4CAF50';
      ok.style.color = 'white';
      ok.style.fontSize = '16px';
      ok.style.fontWeight = 'bold';
      ok.style.cursor = 'pointer';
      ok.style.transition = 'all 0.2s';
      ok.onclick = async () => {
        const initials = (input.value || '???').slice(0,3);
        const updated = addScore(score, initials, gameStats);
        
        // Show share code
        const shareCode = encodeScore(score, initials, gameStats);
        const status = document.createElement('div'); 
        status.style.marginTop = '12px'; 
        status.style.fontSize = '12px'; 
        status.style.color = '#4CAF50'; 
        status.innerHTML = '✓ Score saved!<br><br><b>Share Code:</b>';
        
        const codeBox = document.createElement('div');
        codeBox.style.background = '#2d2d2d';
        codeBox.style.padding = '8px';
        codeBox.style.borderRadius = '4px';
        codeBox.style.marginTop = '8px';
        codeBox.style.fontSize = '11px';
        codeBox.style.wordBreak = 'break-all';
        codeBox.style.color = '#0f0';
        codeBox.style.fontFamily = 'monospace';
        codeBox.style.cursor = 'pointer';
        codeBox.textContent = shareCode;
        codeBox.title = 'Click to copy';
        codeBox.onclick = () => {
          try {
            navigator.clipboard.writeText(shareCode);
            codeBox.style.background = '#1a5928';
            setTimeout(() => codeBox.style.background = '#2d2d2d', 300);
          } catch(e) {}
        };
        
        status.appendChild(codeBox);
        box.appendChild(status);
        
        setTimeout(() => {
          try { document.body.removeChild(overlay); } catch(e){}
        }, 3500);
        
        if (onDone) onDone(updated);
      };

      ok.onmouseover = () => ok.style.background = '#45a049';
      ok.onmouseout = () => ok.style.background = '#4CAF50';

      const skip = document.createElement('button');
      skip.textContent = '❌ SKIP';
      skip.style.padding = '8px 16px';
      skip.style.borderRadius = '6px';
      skip.style.border = 'none';
      skip.style.background = '#f44336';
      skip.style.color = 'white';
      skip.style.fontSize = '16px';
      skip.style.cursor = 'pointer';
      skip.style.transition = 'all 0.2s';
      skip.onclick = () => {
        try { document.body.removeChild(overlay); } catch(e) {}
        if (onDone) onDone(loadScores());
      };

      skip.onmouseover = () => skip.style.background = '#d32f2f';
      skip.onmouseout = () => skip.style.background = '#f44336';

      input.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter') ok.click();
        if (e.key === 'Escape') skip.click();
      });

      btnRow.appendChild(ok);
      btnRow.appendChild(skip);

      box.appendChild(title);
      box.appendChild(scoreLine);
      if (statsDiv.textContent) box.appendChild(statsDiv);
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

  function renderScoreboard(target, showDetails = false){
    const scores = loadScores();
    const container = target || document.createElement('div');
    container.innerHTML = '';
    container.style.fontFamily = 'sans-serif';
    container.style.color = '#fff';
    container.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e)';
    container.style.padding = '20px';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    container.style.minWidth = '300px';

    const title = document.createElement('h3');
    title.textContent = '🏆 HIGH SCORES';
    title.style.margin = '0 0 16px 0';
    title.style.color = '#ffd700';
    title.style.fontSize = '24px';
    title.style.textAlign = 'center';
    title.style.fontWeight = 'bold';
    container.appendChild(title);

    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';

    for (let i=0;i<MAX_SCORES;i++){
      const entry = document.createElement('div');
      entry.style.display = 'flex';
      entry.style.alignItems = 'center';
      entry.style.padding = '12px';
      entry.style.borderRadius = '8px';
      entry.style.background = i === 0 ? 'rgba(255, 215, 0, 0.1)' : i === 1 ? 'rgba(192, 192, 192, 0.1)' : i === 2 ? 'rgba(205, 127, 50, 0.1)' : 'rgba(255, 255, 255, 0.05)';
      entry.style.border = i < 3 ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)';

      if (scores[i]) {
        const scoreData = scores[i];
        const rank = document.createElement('div');
        rank.textContent = `${i + 1}.`;
        rank.style.fontSize = '18px';
        rank.style.fontWeight = 'bold';
        rank.style.width = '30px';
        rank.style.color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#fff';

        const info = document.createElement('div');
        info.style.flex = '1';

        const nameScore = document.createElement('div');
        nameScore.style.fontSize = '16px';
        nameScore.style.fontWeight = 'bold';
        nameScore.textContent = `${scoreData.initials} — ${scoreData.score.toLocaleString()}`;
        info.appendChild(nameScore);

        if (showDetails && scoreData.enemiesDefeated) {
          const details = document.createElement('div');
          details.style.fontSize = '12px';
          details.style.opacity = '0.8';
          details.style.marginTop = '4px';
          const detailParts = [];
          if (scoreData.enemiesDefeated) detailParts.push(`${scoreData.enemiesDefeated} enemies`);
          if (scoreData.timeSurvived) detailParts.push(`${Math.floor(scoreData.timeSurvived)}s`);
          if (scoreData.maxCombo) detailParts.push(`Combo: ${scoreData.maxCombo}`);
          details.textContent = detailParts.join(' • ');
          info.appendChild(details);
        }

        const date = document.createElement('div');
        date.style.fontSize = '11px';
        date.style.opacity = '0.6';
        date.textContent = new Date(scoreData.date).toLocaleDateString();
        date.style.marginLeft = 'auto';

        entry.appendChild(rank);
        entry.appendChild(info);
        entry.appendChild(date);
      } else {
        entry.style.opacity = '0.5';
        entry.textContent = `${i + 1}. --- — 0`;
        entry.style.textAlign = 'center';
        entry.style.fontStyle = 'italic';
      }
      list.appendChild(entry);
    }
    container.appendChild(list);

    // Add export/import buttons
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '8px';
    buttonRow.style.marginTop = '16px';
    buttonRow.style.justifyContent = 'center';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 Export';
    exportBtn.style.padding = '6px 12px';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.border = 'none';
    exportBtn.style.background = '#2196F3';
    exportBtn.style.color = 'white';
    exportBtn.style.cursor = 'pointer';
    exportBtn.onclick = () => {
      const dataStr = JSON.stringify(scores, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skunkfu_highscores.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const importBtn = document.createElement('button');
    importBtn.textContent = '📥 Import';
    importBtn.style.padding = '6px 12px';
    importBtn.style.borderRadius = '4px';
    importBtn.style.border = 'none';
    importBtn.style.background = '#FF9800';
    importBtn.style.color = 'white';
    importBtn.style.cursor = 'pointer';
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedScores = JSON.parse(e.target.result);
              if (Array.isArray(importedScores)) {
                const validScores = importedScores.filter(s => s.score && s.initials).slice(0, MAX_SCORES);
                if (validScores.length > 0) {
                  saveScores(validScores);
                  renderScoreboard(container, showDetails);
                  alert(`Imported ${validScores.length} high scores!`);
                }
              }
            } catch (err) {
              alert('Invalid file format');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    };

    const shareCodeBtn = document.createElement('button');
    shareCodeBtn.textContent = '🔗 Share Code';
    shareCodeBtn.style.padding = '6px 12px';
    shareCodeBtn.style.borderRadius = '4px';
    shareCodeBtn.style.border = 'none';
    shareCodeBtn.style.background = '#9C27B0';
    shareCodeBtn.style.color = 'white';
    shareCodeBtn.style.cursor = 'pointer';
    shareCodeBtn.onclick = () => {
      const promptDiv = document.createElement('div');
      promptDiv.style.position = 'fixed';
      promptDiv.style.left = '50%';
      promptDiv.style.top = '50%';
      promptDiv.style.transform = 'translate(-50%, -50%)';
      promptDiv.style.background = 'rgba(0,0,0,0.95)';
      promptDiv.style.padding = '20px';
      promptDiv.style.borderRadius = '8px';
      promptDiv.style.zIndex = '10000';
      promptDiv.style.minWidth = '300px';
      
      const title = document.createElement('div');
      title.textContent = 'Import Score Code';
      title.style.fontSize = '18px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '12px';
      title.style.color = '#fff';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Paste share code here...';
      input.style.width = '100%';
      input.style.padding = '8px';
      input.style.marginBottom = '12px';
      input.style.borderRadius = '4px';
      input.style.border = '1px solid #666';
      input.style.background = '#222';
      input.style.color = '#fff';
      
      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      
      const importCodeBtn = document.createElement('button');
      importCodeBtn.textContent = 'Import';
      importCodeBtn.style.flex = '1';
      importCodeBtn.style.padding = '8px';
      importCodeBtn.style.borderRadius = '4px';
      importCodeBtn.style.border = 'none';
      importCodeBtn.style.background = '#4CAF50';
      importCodeBtn.style.color = 'white';
      importCodeBtn.style.cursor = 'pointer';
      importCodeBtn.onclick = () => {
        const result = importScoreCode(input.value.trim());
        if (result.success) {
          alert('Score imported successfully!');
          renderScoreboard(container, showDetails);
          document.body.removeChild(promptDiv);
        } else {
          alert(result.error || 'Failed to import score');
        }
      };
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.flex = '1';
      cancelBtn.style.padding = '8px';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.border = 'none';
      cancelBtn.style.background = '#666';
      cancelBtn.style.color = 'white';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.onclick = () => document.body.removeChild(promptDiv);
      
      btnRow.appendChild(importCodeBtn);
      btnRow.appendChild(cancelBtn);
      promptDiv.appendChild(title);
      promptDiv.appendChild(input);
      promptDiv.appendChild(btnRow);
      document.body.appendChild(promptDiv);
      input.focus();
    };

    buttonRow.appendChild(exportBtn);
    buttonRow.appendChild(importBtn);
    buttonRow.appendChild(shareCodeBtn);
    container.appendChild(buttonRow);

    return container;
  }

  window.Highscores = {
    loadScores,
    saveScores,
    isHighScore,
    addScore,
    promptForInitials,
    renderScoreboard,
    loadAchievements,
    saveAchievements,
    checkAchievements,
    renderAchievements,
    validateScore,
    encodeScore,
    decodeScore,
    importScoreCode,
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
