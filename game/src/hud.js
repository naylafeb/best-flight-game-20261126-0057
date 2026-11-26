// The cockpit overlay: altitude, speed, heading, artificial horizon, throttle,
// rings, timer and score, plus the title, pause, game-over and complete screens.
// All DOM, so it renders into the screenshots exactly as the player sees it.
import { GAME, RINGS } from './config.js';

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createHud(doc) {
  const el = (id) => doc.getElementById(id);
  const alt = el('hud-alt');
  const speed = el('hud-speed');
  const heading = el('hud-heading');
  const horizon = el('horizon');
  const horizonCtx = horizon.getContext('2d');
  const throttleFill = el('hud-throttle-fill');
  const rings = el('hud-rings');
  const time = el('hud-time');
  const score = el('hud-score');
  const message = el('hud-message');
  const screens = {
    title: el('screen-title'),
    paused: el('screen-paused'),
    over: el('screen-over'),
    complete: el('screen-complete'),
  };
  let messageUntil = 0;

  function drawHorizon(pitch, roll) {
    const w = horizon.width;
    const h = horizon.height;
    const ctx = horizonCtx;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-roll);
    const offset = Math.max(-h, Math.min(h, pitch * h * 1.4));
    ctx.fillStyle = '#3a7bd5';
    ctx.fillRect(-w, -h + offset, w * 2, h);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-w, offset, w * 2, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, offset);
    ctx.lineTo(w, offset);
    ctx.stroke();
    ctx.restore();
    // Fixed aircraft symbol in the centre.
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 18, h / 2);
    ctx.lineTo(w / 2 - 4, h / 2);
    ctx.moveTo(w / 2 + 4, h / 2);
    ctx.lineTo(w / 2 + 18, h / 2);
    ctx.moveTo(w / 2, h / 2 - 2);
    ctx.lineTo(w / 2, h / 2 + 6);
    ctx.stroke();
  }

  function compassText(headingDeg) {
    const index = Math.round(headingDeg / 45) % 8;
    return `${String(Math.round(headingDeg)).padStart(3, '0')}° ${COMPASS[index]}`;
  }

  function update(state, now) {
    alt.textContent = `${Math.max(0, Math.round(state.pos.y * 3.28)).toLocaleString('en-US')} FT`;
    speed.textContent = `${Math.round(state.speed * 1.9)} KT`;
    const headingDeg = ((-state.yaw * 180 / Math.PI) % 360 + 360) % 360;
    heading.textContent = compassText(headingDeg);
    drawHorizon(state.pitch, state.roll);
    throttleFill.style.width = `${Math.round(state.throttle * 100)}%`;
    rings.textContent = `RINGS ${state.ringsPassed}/${RINGS.length}`;
    time.textContent = formatTime(state.elapsed);
    score.textContent = `SCORE ${state.score}`;
    if (state.message && now < messageUntil) {
      message.textContent = state.message;
      message.style.opacity = '1';
    } else {
      message.style.opacity = '0';
    }
  }

  function flash(text, seconds, now) {
    message.textContent = text;
    messageUntil = now + seconds;
  }

  function showScreen(name, data) {
    for (const [key, node] of Object.entries(screens)) {
      node.classList.toggle('hidden', key !== name);
    }
    if (name === 'title' && data) {
      el('title-best').textContent = data.best > 0 ? `BEST ${data.best}` : '';
    }
    if (name === 'over' && data) {
      el('over-score').textContent = `SCORE ${data.score}`;
      el('over-best').textContent = `BEST ${data.best}`;
      el('over-reason').textContent = data.reason;
    }
    if (name === 'complete' && data) {
      el('complete-score').textContent = `SCORE ${data.score}`;
      el('complete-time').textContent = `TIME ${formatTime(data.elapsed)}`;
      el('complete-best').textContent = `BEST ${data.best}`;
    }
  }

  return { update, flash, showScreen };
}
