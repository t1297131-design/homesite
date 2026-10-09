const universe = document.querySelector(".universe");
const canvas = document.querySelector(".starfield");
const ctx = canvas.getContext("2d");
const wordmark = document.querySelector(".wordmark");
const motionButton = document.querySelector(".motion-button");
const motionLabel = document.querySelector(".motion-label");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let pixelRatio = 1;
let stars = [];
let ripples = [];
let trail = [];
let frameId = 0;
let lastFrame = 0;
let lastTrail = 0;
let motionOn = !reduceMotion.matches;
let popTimer;

const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false, lastX: 0, lastY: 0 };

function makeStar() {
  const hue = Math.random() < .73 ? 0 : Math.random() < .65 ? 226 : 267;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
    radius: Math.random() * 1.15 + .28,
    baseAlpha: Math.random() * .54 + .23,
    phase: Math.random() * Math.PI * 2,
    frequency: Math.random() * 1.6 + .45,
    hue,
  };
}

function resize() {
  const rect = universe.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const count = Math.min(480, Math.max(115, Math.round((width * height) / 4300)));
  stars = Array.from({ length: count }, makeStar);
  paint(performance.now(), 0, false);
  scheduleFrame();
}

function scheduleFrame() {
  if (motionOn && !frameId) frameId = requestAnimationFrame(animate);
}

function setMotion(enabled) {
  motionOn = enabled;
  universe.dataset.motion = enabled ? "on" : "off";
  motionButton.setAttribute("aria-pressed", String(enabled));
  motionLabel.textContent = enabled ? "motion on" : "motion off";
  if (enabled) {
    lastFrame = performance.now();
    scheduleFrame();
  } else {
    cancelAnimationFrame(frameId);
    frameId = 0;
    paint(performance.now(), 0, false);
  }
}

function paint(now, delta, animate) {
  ctx.clearRect(0, 0, width, height);
  const step = Math.min(delta / 16.67, 2.2);
  const orbiting = [];
  const influenceRadius = Math.min(190, Math.max(120, width * .15));

  if (animate && pointer.active) {
    pointer.x += (pointer.targetX - pointer.x) * .17;
    pointer.y += (pointer.targetY - pointer.y) * .17;
  }

  for (const ripple of ripples) {
    const previousRadius = ripple.radius;
    if (animate) {
      ripple.radius += delta * .34;
      ripple.life -= delta / 1000;
      for (const star of stars) {
        const dx = star.x - ripple.x;
        const dy = star.y - ripple.y;
        const distance = Math.hypot(dx, dy);
        if (distance > previousRadius && distance <= ripple.radius && distance > 0) {
          const impulse = (1 - Math.min(distance / 650, 1)) * .24;
          star.vx += (dx / distance) * impulse;
          star.vy += (dy / distance) * impulse;
        }
      }
    }
    const alpha = Math.max(0, ripple.life) * .36;
    if (alpha > 0) {
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(197, 183, 255, ${alpha})`;
      ctx.lineWidth = 1.15;
      ctx.shadowColor = "rgba(165, 142, 255, .7)";
      ctx.shadowBlur = 13;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  if (animate) ripples = ripples.filter((ripple) => ripple.life > 0);

  for (const star of stars) {
    if (animate) {
      star.phase += delta * .001 * star.frequency;
      star.x += star.vx * step + .012 * step;
      star.y += star.vy * step;
      star.vx *= Math.pow(.984, step);
      star.vy *= Math.pow(.984, step);
      if (star.x < -2) star.x = width + 2;
      if (star.x > width + 2) star.x = -2;
      if (star.y < -2) star.y = height + 2;
      if (star.y > height + 2) star.y = -2;

      if (pointer.active) {
        const dx = star.x - pointer.x;
        const dy = star.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < influenceRadius && distance > 2) {
          const pull = (1 - distance / influenceRadius) ** 2;
          const orbit = .075 * pull * step;
          star.vx += (-dy / distance) * orbit + (dx / distance) * orbit * .12;
          star.vy += (dx / distance) * orbit + (dy / distance) * orbit * .12;
          if (distance < influenceRadius * .76) orbiting.push({ star, distance });
        }
      }
    }
  }

  ctx.globalCompositeOperation = "lighter";
  for (const star of stars) {
    const twinkle = animate ? .67 + .33 * Math.sin(star.phase) : .84;
    const alpha = star.baseAlpha * twinkle;
    const color = star.hue === 0 ? `rgba(242, 239, 255, ${alpha})` : `hsla(${star.hue}, 82%, 82%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = star.radius > 1 ? 9 : 3;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (animate && pointer.active) {
    const lens = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, influenceRadius * .9);
    lens.addColorStop(0, "rgba(191, 174, 255, .13)");
    lens.addColorStop(.28, "rgba(135, 157, 255, .055)");
    lens.addColorStop(1, "rgba(120, 110, 255, 0)");
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, influenceRadius * .9, 0, Math.PI * 2);
    ctx.fill();

    orbiting.sort((a, b) => a.distance - b.distance);
    const nearby = orbiting.slice(0, 34).map((entry) => entry.star);
    ctx.lineWidth = .65;
    for (let i = 0; i < nearby.length; i++) {
      for (let j = i + 1; j < nearby.length; j++) {
        const a = nearby[i];
        const b = nearby[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 88) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(207, 196, 255, ${(1 - distance / 88) * .23})`;
          ctx.stroke();
        }
      }
    }
  }

  if (animate) {
    for (const particle of trail) {
      particle.life -= delta / particle.duration;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vx *= .98;
      particle.vy *= .98;
      if (particle.life <= 0) continue;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(219, 211, 255, ${particle.life * .74})`;
      ctx.shadowColor = "rgba(170, 153, 255, .9)";
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    trail = trail.filter((particle) => particle.life > 0);
  }
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";
}

function animate(now) {
  frameId = 0;
  const delta = lastFrame ? now - lastFrame : 16.67;
  lastFrame = now;
  paint(now, delta, true);
  scheduleFrame();
}

function popWordmark() {
  wordmark.classList.remove("is-popping");
  void wordmark.offsetWidth;
  wordmark.classList.add("is-popping");
  clearTimeout(popTimer);
  popTimer = setTimeout(() => wordmark.classList.remove("is-popping"), 620);
}

universe.addEventListener("pointermove", (event) => {
  if (!motionOn) return;
  const rect = universe.getBoundingClientRect();
  pointer.targetX = event.clientX - rect.left;
  pointer.targetY = event.clientY - rect.top;
  pointer.active = true;
  const now = performance.now();
  const moveX = pointer.targetX - pointer.lastX;
  const moveY = pointer.targetY - pointer.lastY;
  if (Math.hypot(moveX, moveY) > 2 && now - lastTrail > 13) {
    trail.push({
      x: pointer.targetX,
      y: pointer.targetY,
      vx: -moveX * .055 + (Math.random() - .5) * .6,
      vy: -moveY * .055 + (Math.random() - .5) * .6,
      radius: Math.random() * 1.9 + .7,
      life: 1,
      duration: 460 + Math.random() * 420,
    });
    if (trail.length > 90) trail.splice(0, trail.length - 90);
    lastTrail = now;
  }
  pointer.lastX = pointer.targetX;
  pointer.lastY = pointer.targetY;
  scheduleFrame();
}, { passive: true });

universe.addEventListener("pointerleave", () => { pointer.active = false; });
universe.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) return;
  const rect = universe.getBoundingClientRect();
  ripples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, radius: 2, life: 1 });
  if (ripples.length > 5) ripples.shift();
  scheduleFrame();
});

motionButton.addEventListener("click", () => setMotion(!motionOn));
wordmark.addEventListener("click", popWordmark);
wordmark.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    popWordmark();
  }
});
document.addEventListener("keydown", (event) => {
  if (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "m") setMotion(!motionOn);
});
window.addEventListener("resize", resize, { passive: true });
reduceMotion.addEventListener?.("change", (event) => { if (event.matches) setMotion(false); });

resize();
setMotion(motionOn);
