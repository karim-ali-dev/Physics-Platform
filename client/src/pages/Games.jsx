import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Play, Gamepad2 } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import PhysicsIcon from '../components/PhysicsIcon';

const GAMES = [
  {
    id: 'cannon',
    kind: 'rocket',
    title: 'قاذف المدفع',
    desc: 'ظبط الزاوية والسرعة وحاول تصيب الهدف — تابع المسار المكافئ للقذيفة!',
    tag: 'حركة المقذوفات'
  },
  {
    id: 'cradle',
    kind: 'scale',
    title: 'مهد نيوتن',
    desc: 'زقّ الكرات وشوف الطاقة بتنتقل من طرف للتاني — استكشاف حفظ كمية الحركة.',
    tag: 'كمية الحركة'
  },
  {
    id: 'orbit',
    kind: 'planet',
    title: 'مدار الكواكب',
    desc: 'اسحب وأطلق كوكباً وشوف قوة الجاذبية اللي بتشدّه حوالين الشمس.',
    tag: 'الجاذبية'
  },
  {
    id: 'circuit',
    kind: 'bolt',
    title: 'معمل الدائرة الكهربية',
    desc: 'وصّل البطارية والمقاومة والمصباح وتابع قراءة الأميتر (قانون أوم).',
    tag: 'قانون أوم'
  }
];

function RuleNote({ children }) {
  return (
    <div className="mt-5 rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm leading-7 text-white/70">
      <span className="font-black text-brand-300">⚛️ قعدة الفيزياء: </span>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        <span className="text-white/70">{label}</span>
        <span className="font-black text-brand-300">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-400"
      />
    </div>
  );
}

/* ---------------- 1) قاذف المدفع ---------------- */
function ProjectileGame() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const controls = useRef({ angle: 45, speed: 70 });
  const sim = useRef({ shots: [], running: false });
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(70);
  const [status, setStatus] = useState('ظبط الزاوية والسرعة وبعدين أطلق 🚀');

  useEffect(() => { controls.current.angle = angle; }, [angle]);
  useEffect(() => { controls.current.speed = speed; }, [speed]);

  useEffect(() => {
    const c = canvasRef.current;
    const setup = () => {
      const w = wrapRef.current.clientWidth || 640;
      const h = Math.max(300, Math.round(w * 0.45));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };
    const { ctx, w, h } = setup();
    const G = 0.32;
    const groundY = h - 34;
    sim.current.groundY = groundY;
    const tx = Math.round(w * 0.76);
    const ty = groundY - 84;

    const drawTarget = () => {
      ctx.fillStyle = 'rgba(251,191,36,0.95)';
      ctx.beginPath(); ctx.arc(tx, ty, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(tx, ty, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d9488';
      ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, groundY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 20, groundY); ctx.lineTo(tx + 20, groundY); ctx.stroke();
    };

    const drawPrediction = () => {
      const rad = (controls.current.angle * Math.PI) / 180;
      const vx = controls.current.speed * Math.cos(rad);
      const vy = -controls.current.speed * Math.sin(rad);
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = 'rgba(45,212,191,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let x = 18, y = groundY, t = 0;
      ctx.moveTo(x, y);
      for (let i = 0; i < 400; i++) {
        t += 0.7;
        x = 18 + vx * t;
        y = groundY + vy * t + 0.5 * G * t * t;
        if (y > groundY || x > w) break;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawShot = (s) => {
      for (let i = 0; i < s.trail.length; i++) {
        const p = s.trail[i];
        const alpha = (i + 1) / s.trail.length;
        ctx.fillStyle = `rgba(45,212,191,${alpha * 0.5})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
    };

    let raf;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(11,11,22,0.85)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % w;
        const sy = (i * 53) % (groundY - 20);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // المدفع
      const rad = (controls.current.angle * Math.PI) / 180;
      ctx.save();
      ctx.translate(16, groundY);
      ctx.rotate(-rad);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(0, -4, 44, 8);
      ctx.restore();
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath(); ctx.arc(16, groundY, 10, 0, Math.PI * 2); ctx.fill();

      drawTarget();
      if (!sim.current.running) drawPrediction();

      sim.current.shots.forEach(drawShot);
      sim.current.shots.forEach((s) => {
        if (s.done) return;
        s.vy += G * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 70) s.trail.shift();
        if (s.y >= groundY) {
          s.y = groundY;
          s.done = true;
          s.dist = Math.abs(s.x - tx);
        }
      });

      if (sim.current.running && sim.current.shots.every((s) => s.done)) {
        sim.current.running = false;
        const s = sim.current.shots[0];
        if (s.dist <= 26) {
          setStatus('🎯 إصابة مباشرة! أحسنت — ده المسار المكافئ بالظبط.');
        } else {
          setStatus(`المرمية وقفت عند ${Math.round(s.dist)} بكسل من الهدف. جرّب زاوية أقرب لـ 45° أو غيّر السرعة.`);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const fire = () => {
    const rad = (controls.current.angle * Math.PI) / 180;
    sim.current.shots = [{
      x: 18,
      y: sim.current.groundY,
      vx: controls.current.speed * Math.cos(rad),
      vy: -controls.current.speed * Math.sin(rad),
      trail: [],
      done: false,
      dist: null
    }];
    sim.current.running = true;
    setStatus('🚀 القذيفة في الجو...');
  };

  return (
    <div>
      <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} className="block w-full" />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <Slider label="زاوية القذف" value={angle} min={10} max={85} onChange={setAngle} suffix="°" />
          <Slider label="سرعة الانطلاق" value={speed} min={30} max={140} onChange={setSpeed} />
        </div>
        <div className="flex flex-col justify-end gap-3">
          <button onClick={fire} className="btn-primary w-full"><Play size={17} /> أطلق 🚀</button>
          <button
            onClick={() => { sim.current.shots = []; sim.current.running = false; setStatus('ظبط الزاوية والسرعة وبعدين أطلق 🚀'); }}
            className="btn-ghost w-full"
          >
            <RotateCcw size={16} /> امسح المسارات
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm font-bold text-white/75">{status}</div>
      <RuleNote>
        القذيفة بتتحرك في <b className="text-brand-300">مسار مكافئ</b> لأن سرعتها الأفقية ثابتة بينما الجاذبية بتسحبها لتحت. أقصى مدى بيبقى عند زاوية <b className="text-brand-300">45°</b>.
      </RuleNote>
    </div>
  );
}

/* ---------------- 2) مهد نيوتن ---------------- */
function CradleGame() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sim = useRef({ active: null });
  const [status, setStatus] = useState('اضغط على أي كرة من الطرفين وزقّها 🎯');

  useEffect(() => {
    const c = canvasRef.current;
    const setup = () => {
      const w = wrapRef.current.clientWidth || 640;
      const h = 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };
    const { ctx, w, h } = setup();
    const pivotY = 34;
    const L = Math.min(120, h * 0.4);
    const spacing = 52;
    const ballR = 22;
    const pivots = [0, 1, 2, 3, 4].map((i) => w / 2 + (i - 2) * spacing);
    const omega2 = 11;

    const ballPos = (idx, theta) => ({
      x: pivots[idx] + L * Math.sin(theta),
      y: pivotY + L * Math.cos(theta)
    });

    let raf;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const a = sim.current.active;
      if (a) {
        const prev = a.prev != null ? a.prev : a.theta;
        a.omega += -omega2 * a.theta * dt;
        a.theta += a.omega * dt;
        const crossed = (prev > 0 && a.theta <= 0) || (prev < 0 && a.theta >= 0);
        if (!a.transferred && crossed && a.idx !== 2 && Math.abs(a.omega) > 0.2) {
          const opposite = 4 - a.idx;
          sim.current.active = { idx: opposite, theta: 0, omega: a.omega, transferred: true };
          setStatus('⚡ كمية الحركة اتنتقلت للكرة المقابلة!');
        } else {
          a.prev = a.theta;
        }
        if (Math.abs(a.theta) < 0.03 && Math.abs(a.omega) < 0.02) {
          sim.current.active = null;
          setStatus('اضغط على أي كرة تاني عشان تلعب تاني 🎯');
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(11,11,22,0.85)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(45,212,191,0.25)';
      ctx.fillRect(0, 0, w, 14);
      ctx.fillStyle = 'rgba(251,191,36,0.35)';
      ctx.beginPath(); ctx.arc(w / 2, 7, 60, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(w, 7); ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const theta = a && a.idx === i ? a.theta : 0;
        const p = ballPos(i, theta);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pivots[i], pivotY); ctx.lineTo(p.x, p.y); ctx.stroke();

        const isActive = a && a.idx === i;
        const grad = ctx.createRadialGradient(p.x - 6, p.y - 8, 3, p.x, p.y, ballR);
        if (isActive) {
          grad.addColorStop(0, '#fde68a');
          grad.addColorStop(1, '#f59e0b');
        } else {
          grad.addColorStop(0, '#99f6e4');
          grad.addColorStop(1, '#0d9488');
        }
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, ballR, 0, Math.PI * 2); ctx.fill();
        if (isActive) {
          ctx.strokeStyle = 'rgba(251,191,36,0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, ballR + 3, 0, Math.PI * 2); ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => setup();
    window.addEventListener('resize', onResize);

    const onClick = (e) => {
      if (sim.current.active) return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let picked = -1;
      for (let i = 0; i < 5; i++) {
        const p = ballPos(i, 0);
        if (Math.hypot(mx - p.x, my - p.y) < ballR + 10) picked = i;
      }
      if (picked >= 0) {
        const dir = picked < 2 ? -1 : 1;
        sim.current.active = { idx: picked, theta: 0.55 * dir, omega: 0, transferred: false };
        setStatus('🎾 الكرة ماشية...');
      }
    };
    c.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      c.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div>
      <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} className="block w-full" style={{ height: '300px' }} />
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm font-bold text-white/75">{status}</div>
      <RuleNote>
        في مهد نيوتن الطاقة بتنتقل بين الكرات لأن كمية الحركة محفوظة (طالما مفيش احتكاك). الكرة اللي بتضرب بتوقف، والكرة الطرف التاني بتتحرك بنفس السرعة.
      </RuleNote>
    </div>
  );
}

/* ---------------- 3) مدار الكواكب ---------------- */
function OrbitGame() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sim = useRef({ bodies: [], drag: null, dragEnd: null, crashed: false });
  const [status, setStatus] = useState('اضغط واسحب من أي نقطة، وسيبها لإطلاق كوكب 🔭');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const c = canvasRef.current;
    const setup = () => {
      const w = wrapRef.current.clientWidth || 640;
      const h = Math.max(420, Math.round(w * 0.55));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };
    const { ctx, w, h } = setup();
    const star = { x: w / 2, y: h / 2, r: 16 };
    const Gstar = 12000;

    let raf;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(11,11,22,0.92)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect((i * 137) % w, (i * 71) % h, 1.5, 1.5);
      }

      // الشمس
      const glow = ctx.createRadialGradient(star.x, star.y, 2, star.x, star.y, 90);
      glow.addColorStop(0, 'rgba(251,191,36,0.85)');
      glow.addColorStop(0.4, 'rgba(251,191,36,0.25)');
      glow.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(star.x, star.y, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(star.x - 4, star.y - 4, 5, 0, Math.PI * 2); ctx.fill();

      const bodies = sim.current.bodies;
      bodies.forEach((b) => {
        if (b.dead) return;
        const dx = star.x - b.x;
        const dy = star.y - b.y;
        const r = Math.max(26, Math.hypot(dx, dy));
        const pull = Gstar / (r * r);
        b.vx += (pull * dx / r) * dt;
        b.vy += (pull * dy / r) * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 110) b.trail.shift();
        if (r < 24) {
          b.dead = true;
          b.crashed = true;
          if (!sim.current.crashed) {
            sim.current.crashed = true;
            setStatus('☀️ الكوكب ارتطم بالشمس! السرعة كانت صغيرة — جرّب تطلق أسرع.');
          }
        }
        if (b.x < -w * 0.6 || b.x > w * 1.6 || b.y < -h * 0.6 || b.y > h * 1.6) {
          b.dead = true;
          if (!sim.current.crashed) {
            sim.current.crashed = true;
            setStatus('🚀 الكوكب طار في الفضاء! السرعة أكبر من اللازم — جرّب أبطأ شوية.');
          }
        }
      });

      bodies.forEach((b) => {
        if (b.dead) return;
        if (b.trail.length > 1) {
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          b.trail.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
      });

      if (sim.current.drag) {
        const d = sim.current.drag;
        const e = sim.current.dragEnd || d;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(45,212,191,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        ctx.setLineDash([]);
        const ang = Math.atan2(e.y - d.y, e.x - d.x);
        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x - 12 * Math.cos(ang - 0.4), e.y - 12 * Math.sin(ang - 0.4));
        ctx.lineTo(e.x - 12 * Math.cos(ang + 0.4), e.y - 12 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    const onResize = () => setup();
    window.addEventListener('resize', onResize);

    const pos = (e) => {
      const rect = c.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const down = (e) => { sim.current.drag = pos(e); sim.current.dragEnd = pos(e); c.setPointerCapture(e.pointerId); };
    const move = (e) => { if (sim.current.drag) sim.current.dragEnd = pos(e); };
    const up = (e) => {
      if (!sim.current.drag) return;
      const d = sim.current.drag;
      const en = sim.current.dragEnd || d;
      const vx = (en.x - d.x) * 0.08;
      const vy = (en.y - d.y) * 0.08;
      sim.current.drag = null;
      sim.current.dragEnd = null;
      sim.current.crashed = false;
      const color = sim.current.bodies.length % 2 === 0 ? '#2dd4bf' : '#5eead4';
      sim.current.bodies.push({ x: d.x, y: d.y, vx, vy, trail: [], dead: false, color });
      setCount((n) => n + 1);
      setStatus('🌍 كوكب جديد انطلق! هيعمل مدار ولا هيطير في الفضاء؟');
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
    };
  }, []);

  const reset = () => {
    sim.current.bodies = [];
    sim.current.drag = null;
    setCount(0);
    setStatus('اضغط واسحب من أي نقطة، وسيبها لإطلاق كوكب 🔭');
  };

  return (
    <div>
      <div ref={wrapRef} className="overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} className="block w-full touch-none" />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm font-bold text-white/75">{status}</div>
        <button onClick={reset} className="btn-ghost shrink-0"><RotateCcw size={16} /> امسح الكواكب</button>
      </div>
      <RuleNote>
        قوة الجاذبية بتتناسب عكسياً مع <b className="text-brand-300">مربع المسافة</b> (قانون نيوتن). لو سرعة الإطلاق مناسبة، الكوكب هيكمل <b className="text-brand-300">مداراً مغلقاً</b> حوالين الشمس.
      </RuleNote>
    </div>
  );
}

/* ---------------- 4) معمل الدائرة الكهربية ---------------- */
function CircuitGame() {
  const [voltage, setVoltage] = useState(9);
  const [resistance, setResistance] = useState(5);
  const [on, setOn] = useState(false);
  const [blown, setBlown] = useState(false);
  const [lastI, setLastI] = useState(0);
  const [msg, setMsg] = useState('اقفل المفتاح وشوف قراءة الأميتر — القانون: I = V ÷ R');

  const toggleSwitch = () => {
    if (blown) return;
    const next = !on;
    setOn(next);
    if (next) {
      const i = voltage / resistance;
      setLastI(i);
      if (i > 2.5) {
        setBlown(true);
        setMsg('🔥 المصباح انفجر! التيار عالي جداً (أكثر من 2.5 أمبير) — زوّد المقاومة أو قلّل الفولت.');
      } else {
        setMsg(`💡 المصباح اتوهج والتيار = ${i.toFixed(2)} أمبير (${voltage} ÷ ${resistance} = ${i.toFixed(2)})`);
      }
    } else {
      setMsg('الدائرة مفتوحة — مفيش تيار بيمر.');
    }
  };

  const reset = () => {
    setOn(false);
    setBlown(false);
    setLastI(0);
    setMsg('اقفل المفتاح وشوف قراءة الأميتر — القانون: I = V ÷ R');
  };

  const glow = on && !blown;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-4">
        <svg viewBox="0 0 360 220" className="mx-auto w-full max-w-lg">
          {/* الأسلاك */}
          <g stroke="rgba(255,255,255,0.45)" strokeWidth="3" fill="none">
            <line x1="50" y1="50" x2="172" y2="50" />
            <line x1="188" y1="50" x2="310" y2="50" />
            <line x1="310" y1="50" x2="310" y2="94" />
            <line x1="310" y1="126" x2="310" y2="170" />
            <line x1="310" y1="170" x2="252" y2="170" />
            <line x1="188" y1="170" x2="50" y2="170" />
            <line x1="50" y1="170" x2="50" y2="132" />
            <line x1="50" y1="88" x2="50" y2="50" />
            <line x1="252" y1="170" x2="240" y2="170" />
            <line x1="200" y1="170" x2="188" y2="170" />
          </g>
          {/* المقاومة */}
          <g stroke="rgba(45,212,191,0.95)" strokeWidth="3" fill="none" strokeLinejoin="round">
            <polyline points="240,170 230,160 218,180 206,160 194,180 182,160 200,170" transform="translate(-10,0)" />
          </g>
          {/* المفتاح */}
          <g stroke="#fbbf24" strokeWidth="4" strokeLinecap="round">
            {on ? (
              <line x1="172" y1="50" x2="188" y2="50" />
            ) : (
              <line x1="172" y1="50" x2="189" y2="38" />
            )}
          </g>
          {/* البطارية */}
          <g>
            <line x1="50" y1="96" x2="50" y2="124" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
            <line x1="36" y1="103" x2="36" y2="117" stroke="#fbbf24" strokeWidth="4" />
            <line x1="64" y1="101" x2="64" y2="119" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
            <text x="20" y="96" fill="#fbbf24" fontSize="14" fontWeight="800">+</text>
            <text x="68" y="120" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="800">−</text>
          </g>
          {/* المصباح */}
          <g>
            <circle cx="310" cy="110" r="16" fill={glow ? '#fbbf24' : 'rgba(255,255,255,0.05)'} stroke={glow ? '#fbbf24' : 'rgba(255,255,255,0.5)'} strokeWidth="3"
              className={glow ? 'animate-pulseSoft' : ''} style={{ filter: glow ? 'drop-shadow(0 0 12px #fbbf24)' : 'none' }} />
            <line x1="300" y1="100" x2="320" y2="120" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
            <line x1="320" y1="100" x2="300" y2="120" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          </g>
          {/* الأميتر */}
          <g transform="translate(120,110)">
            <rect x="-22" y="-18" width="44" height="36" rx="8" fill="rgba(11,11,22,0.8)" stroke="rgba(45,212,191,0.6)" />
            <text x="0" y="-3" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9">أميتر</text>
            <text x="0" y="12" textAnchor="middle" fill="#2dd4bf" fontSize="15" fontWeight="800">
              {glow ? `${lastI.toFixed(2)} A` : blown ? '✕' : '0.00 A'}
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <Slider label="فولت البطارية (V)" value={voltage} min={1.5} max={12} step={0.5} onChange={setVoltage} suffix=" فولت" />
          <Slider label="المقاومة (R)" value={resistance} min={1} max={20} onChange={setResistance} suffix=" أوم" />
        </div>
        <div className="flex flex-col justify-end gap-3">
          <button onClick={toggleSwitch} className="btn-primary w-full" disabled={blown}>
            {blown ? 'المصهر اتحرق 💥' : on ? 'افتح المفتاح' : 'اقفل المفتاح'}
          </button>
          <button onClick={reset} className="btn-ghost w-full"><RotateCcw size={16} /> أعد التشغيل</button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm font-bold text-white/75">{msg}</div>
      <RuleNote>
        <b className="text-brand-300">قانون أوم:</b> I = V ÷ R. كل ما زاد الفولت زاد التيار، وكل ما زادت المقاومة قلّ التيار. لو التيار زاد عن حد المصباح → هينفجر!
      </RuleNote>
    </div>
  );
}

/* ---------------- الصفحة ---------------- */
export default function Games() {
  const [active, setActive] = useState(null);
  const game = GAMES.find((g) => g.id === active);

  return (
    <div className="pt-28 pb-20">
      <div className="container-x">
        <SectionHeading
          badge="ألعاب فيزيائية"
          title={<span className="grad-text">هتلعب فيزياء وتفهمها</span>}
          subtitle="جرّب قوانين الميكانيكا والكهرباء بنفسك — كل لعبة بتحاكي قانون فيزيائي حقيقي من المنهج."
        />
      </div>

      {game ? (
        <section className="container-x mt-2">
          <button onClick={() => setActive(null)} className="btn-ghost !px-4 !py-2 text-sm">
            <ArrowLeft size={16} /> كل الألعاب
          </button>
          <div className="card mt-6 overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
                <PhysicsIcon kind={game.kind} size={32} />
              </span>
              <div>
                <span className="text-xs font-bold text-neon-300">{game.tag}</span>
                <h2 className="text-xl font-black sm:text-2xl">{game.title}</h2>
                <p className="mt-1 text-sm text-white/55">{game.desc}</p>
              </div>
            </div>
            <div className="mt-6">
              {active === 'cannon' && <ProjectileGame />}
              {active === 'cradle' && <CradleGame />}
              {active === 'orbit' && <OrbitGame />}
              {active === 'circuit' && <CircuitGame />}
            </div>
          </div>
        </section>
      ) : (
        <section className="container-x mt-4 grid gap-6 md:grid-cols-2">
          {GAMES.map((g, i) => (
            <div key={g.id} className="card hover-lift group flex flex-col p-6 transition-colors hover:border-brand-500/40">
              <div className="flex items-start justify-between">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <PhysicsIcon kind={g.kind} size={34} />
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-neon-300">{g.tag}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold group-hover:text-brand-300">{g.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-white/55">{g.desc}</p>
              <button onClick={() => setActive(g.id)} className="btn-primary mt-5 w-full !py-2.5 text-sm">
                <Gamepad2 size={17} /> العب الآن
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="container-x mt-16">
        <div className="card flex flex-col items-center justify-between gap-6 p-8 text-center sm:flex-row sm:text-right">
          <div>
            <h3 className="text-xl font-black">خلصت لعب؟ دلوقتي دور المذاكرة 😄</h3>
            <p className="mt-2 text-sm text-white/55">كل الألعاب دي مبنية على قوانين بندرسها في الكورسات — سجّل وشوف شرحها بالتفصيل.</p>
          </div>
          <Link to="/courses" className="btn-primary shrink-0">شوف الكورسات <ArrowLeft size={17} /></Link>
        </div>
      </section>
    </div>
  );
}
