// SleepSync — Shared Components
const C = window.SS.c;

// ── Primitives ────────────────────────────────────────────────────────────────

const SmallCapsLabel = ({ children, style = {} }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: C.textTer,
    fontFamily: 'inherit', display: 'block', ...style,
  }}>{children}</span>
);

const StatNumber = ({ value, label, size = 52, style = {} }) => (
  <div style={{ textAlign: 'center', ...style }}>
    <div style={{
      fontSize: size, fontWeight: 600, color: C.text, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
    }}>{value}</div>
    <SmallCapsLabel style={{ marginTop: 6, textAlign: 'center' }}>{label}</SmallCapsLabel>
  </div>
);

const PrimaryCTA = ({ label, onPress, disabled = false, style = {} }) => {
  const [pressed, setPressed] = React.useState(false);
  // Derive rgba from accent hex for glass tint
  const hex = C.accent.replace('#','');
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  return (
    <button
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)} onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)} onClick={!disabled ? onPress : undefined}
      style={{
        width: '100%', padding: '18px 24px',
        background: disabled
          ? `rgba(${r},${g},${b},0.15)`
          : `rgba(${r},${g},${b},0.32)`,
        border: `1px solid rgba(255,255,255,${disabled ? 0.07 : 0.18})`,
        borderRadius: 16, color: disabled ? `rgba(255,255,255,0.4)` : '#fff',
        fontSize: 16, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        transform: pressed && !disabled ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 120ms ease',
        letterSpacing: '0.01em', fontFamily: 'inherit',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: disabled ? 'none' : [
          'inset 0 1px 0 rgba(255,255,255,0.22)',
          'inset 0 -1px 0 rgba(0,0,0,0.18)',
          `0 4px 28px rgba(${r},${g},${b},0.38)`,
          '0 1px 3px rgba(0,0,0,0.5)',
        ].join(', '),
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      {/* Glass sheen */}
      {!disabled && <div style={{
        position:'absolute', top:0, left:0, right:0, height:'52%',
        background:'linear-gradient(to bottom, rgba(255,255,255,0.13), rgba(255,255,255,0))',
        borderRadius:'16px 16px 0 0', pointerEvents:'none',
      }}/>}
      <span style={{ position:'relative', zIndex:1 }}>{label}</span>
    </button>
  );
};

// ── PatchSimulator ────────────────────────────────────────────────────────────

const PatchSimulator = ({ dose = 0.5, isActive = true, onClick, size = 200 }) => {
  // Quadratic scaling → dramatic contrast between low and high dose
  const d2 = dose * dose;
  const br = Math.round(size * 0.17); // patch corner radius

  const g1 = d2 * 0.88, g2 = d2 * 0.48, g3 = d2 * 0.20;
  const s1 = d2 * 72,   s2 = d2 * 148,  s3 = d2 * 230;

  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: br, position: 'relative',
      cursor: onClick ? 'pointer' : 'default',
      // Patch backing layer — dark layered material
      background: `linear-gradient(148deg,
        rgba(34,28,60,0.97) 0%,
        rgba(18,14,38,0.99) 55%,
        rgba(28,22,52,0.97) 100%)`,
      border: `1px solid rgba(255,255,255,${0.04 + dose * 0.09})`,
      boxShadow: [
        `0 0 ${s1}px rgba(123,92,240,${g1})`,
        `0 0 ${s2}px rgba(100,55,220,${g2})`,
        `0 0 ${s3}px rgba(80,30,200,${g3})`,
        `inset 0 1px 0 rgba(255,255,255,${0.04 + dose * 0.08})`,
        `inset 0 0 0 1px rgba(255,255,255,${0.02 + dose * 0.06})`,
      ].join(', '),
      animation: isActive && dose > 0.05 ? 'patchPulse 3.2s ease-in-out infinite' : 'none',
    }}>

      {/* Adhesive border ring */}
      <div style={{
        position:'absolute', inset: Math.round(size * 0.08),
        borderRadius: Math.round(br * 0.65),
        border: `1px solid rgba(123,92,240,${0.05 + d2 * 0.35})`,
      }}/>

      {/* Delivery membrane — the glowing inset window */}
      <div style={{
        position:'absolute', inset: Math.round(size * 0.2),
        borderRadius: Math.round(br * 0.42),
        background: `radial-gradient(circle at 38% 32%,
          rgba(165,125,255,${d2 * 0.52}) 0%,
          rgba(123,92,240,${d2 * 0.68}) 35%,
          rgba(70,40,180,${d2 * 0.38}) 68%,
          rgba(18,14,38,0.65) 100%)`,
        border: `1px solid rgba(123,92,240,${0.04 + d2 * 0.42})`,
        boxShadow: d2 > 0.04
          ? `inset 0 0 ${d2 * 44}px rgba(123,92,240,${d2 * 0.58})`
          : 'none',
      }}/>

      {/* Center luminance node */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width: Math.round(size * 0.065), height: Math.round(size * 0.065),
        borderRadius: 3,
        background: `rgba(205,175,255,${0.08 + d2 * 0.92})`,
        boxShadow: `0 0 ${d2 * 22}px rgba(165,125,255,${d2 * 0.95})`,
      }}/>

      {/* Corner registration marks */}
      {[[0.07,0.07],[0.82,0.07],[0.07,0.82],[0.82,0.82]].map(([fx,fy],i) => (
        <div key={i} style={{
          position:'absolute',
          left: fx*size, top: fy*size,
          width: size*0.045, height: size*0.045, borderRadius: 1,
          background: `rgba(255,255,255,${0.04 + dose * 0.07})`,
        }}/>
      ))}
    </div>
  );
};

// ── ProfileCurve ─────────────────────────────────────────────────────────────

const ProfileCurve = ({ keyframes, width = 330, height = 140, showLabels = true, currentT = null, mini = false }) => {
  const pad = { top: 12, right: 12, bottom: showLabels ? 28 : 12, left: 12 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const toX = t => pad.left + t * W;
  const toY = d => pad.top + (1 - d) * H;

  // Smooth path via monotone cubic
  const pts = keyframes.map(kf => [toX(kf.t), toY(kf.dose)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  const fillD = d + ` L${pts[pts.length-1][0]},${pad.top+H} L${pts[0][0]},${pad.top+H} Z`;
  const labelKfs = keyframes.filter(kf => kf.label);

  // Stagger labels that would overlap (< 54px apart)
  const labelNodes = (() => {
    const nodes = [];
    let prevX = -999;
    for (let i = 0; i < labelKfs.length; i++) {
      const kf = labelKfs[i];
      const x = toX(kf.t);
      const tooClose = (x - prevX) < 54;
      const y = tooClose ? height - 18 : height - 4;
      prevX = tooClose ? prevX : x;
      nodes.push({ x, y, label: kf.label });
    }
    return nodes;
  })();

  // Interpolate dose at currentT
  let curX, curY;
  if (currentT !== null) {
    curX = toX(currentT);
    let dose = 0;
    for (let i = 1; i < keyframes.length; i++) {
      if (currentT <= keyframes[i].t) {
        const a = keyframes[i - 1], b = keyframes[i];
        const f = (currentT - a.t) / (b.t - a.t);
        dose = a.dose + f * (b.dose - a.dose);
        break;
      }
    }
    curY = toY(dose);
  }

  const gradId = `cg${Math.random().toString(36).slice(2,6)}`;
  const ac = C.accent;
  const hex = ac.replace('#','');
  const acR = parseInt(hex.slice(0,2),16), acG = parseInt(hex.slice(2,4),16), acB = parseInt(hex.slice(4,6),16);
  const accentMid = `rgba(${acR},${acG},${acB},0.35)`;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ac} stopOpacity={mini ? 0.18 : 0.28}/>
          <stop offset="100%" stopColor={ac} stopOpacity={0.02}/>
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`}/>
      <path d={d} fill="none" stroke={ac} strokeWidth={mini ? 1.5 : 2}
        strokeLinecap="round" strokeLinejoin="round"/>
      {showLabels && labelNodes.map((n, i) => (
        <text key={i} x={n.x} y={n.y} textAnchor="middle"
          fill="rgba(245,245,247,0.35)" fontSize={9} fontWeight={600}
          fontFamily="-apple-system,Inter,sans-serif" letterSpacing="0.08em">
          {n.label.toUpperCase()}
        </text>
      ))}
      {currentT !== null && (
        <g>
          <circle cx={curX} cy={curY} r={4} fill={ac}/>
          <circle cx={curX} cy={curY} r={7} fill="none" stroke={accentMid} strokeWidth={1.5}/>
        </g>
      )}
    </svg>
  );
};

// ── PhaseTimelineStrip ────────────────────────────────────────────────────────

const PhaseTimelineStrip = ({ phases, currentIdx, phaseProgress }) => (
  <div style={{ display: 'flex', gap: 3, width: '100%', alignItems: 'center' }}>
    {phases.map((ph, i) => {
      const isPast = i < currentIdx, isCur = i === currentIdx;
      return (
        <div key={i} style={{
          flex: ph.duration, height: 3, borderRadius: 2, position: 'relative', overflow: 'hidden',
          background: isPast ? 'rgba(123,92,240,0.45)' : 'rgba(245,245,247,0.1)',
        }}>
          {isCur && <>
            <div style={{ position:'absolute', inset:0, background:'rgba(245,245,247,0.1)' }}/>
            <div style={{
              position:'absolute', top:0, left:0, bottom:0,
              width:`${phaseProgress * 100}%`,
              background: C.accent, borderRadius: 2,
              transition: 'width 800ms linear',
            }}/>
          </>}
        </div>
      );
    })}
  </div>
);

// ── SegmentedControl ──────────────────────────────────────────────────────────

const SegmentedControl = ({ options, value, onChange }) => (
  <div style={{
    display:'flex', background:'rgba(255,255,255,0.06)',
    borderRadius:12, padding:3, gap:2,
  }}>
    {options.map(opt => {
      const sel = value === opt.value;
      return (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          flex:1, padding:'11px 6px', borderRadius:10, border:'none',
          background: sel ? C.surface2 : 'transparent',
          color: sel ? C.text : C.textSec,
          fontSize:14, fontWeight: sel ? 600 : 400, cursor:'pointer',
          transition:'all 150ms ease', fontFamily:'inherit',
          boxShadow: sel ? '0 1px 4px rgba(0,0,0,0.35)' : 'none',
        }}>{opt.label}</button>
      );
    })}
  </div>
);

// ── DotScale ──────────────────────────────────────────────────────────────────

const DotScale = ({ value, max = 5, onChange }) => (
  <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
    {Array.from({length:max}, (_, i) => i+1).map(n => (
      <button key={n} onClick={() => onChange && onChange(n)} style={{
        width:38, height:38, borderRadius:'50%', border:'none', cursor:'pointer',
        background: n <= value ? C.accent : 'rgba(255,255,255,0.07)',
        transition:'background 200ms ease',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, fontWeight:600, color: n <= value ? '#fff' : C.textSec,
        fontFamily:'inherit',
      }}>{n}</button>
    ))}
  </div>
);

// ── SessionCard ───────────────────────────────────────────────────────────────

const SessionCard = ({ session, onClick }) => {
  const glyphColor = session.outcome === 'good' ? C.accent : 'rgba(245,245,247,0.3)';
  const glyph = session.outcome === 'good' ? '✓' : '–';
  return (
    <div onClick={onClick} style={{
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:18,
      padding:'16px 20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer',
    }}>
      <div style={{ flex:1 }}>
        <SmallCapsLabel style={{ marginBottom: 4 }}>{session.date}</SmallCapsLabel>
        <div style={{ fontSize:18, fontWeight:600, color:C.text }}>{session.profile}</div>
        <div style={{ marginTop:3, fontSize:13, color:C.textSec, lineHeight:1.4 }}>{session.summary}</div>
      </div>
      <div style={{
        width:30, height:30, borderRadius:'50%',
        background: session.outcome === 'good' ? C.accentDim : 'rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, fontWeight:700, color: glyphColor,
      }}>{glyph}</div>
    </div>
  );
};

// ── BottomSheet ───────────────────────────────────────────────────────────────

const BottomSheet = ({ visible, onClose, children }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    if (visible) { setTimeout(() => setMounted(true), 10); }
    else { setMounted(false); }
  }, [visible]);
  if (!visible && !mounted) return null;
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100,
      background: mounted && visible ? 'rgba(0,0,0,0.55)' : 'transparent',
      transition:'background 300ms ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position:'absolute', bottom:0, left:0, right:0,
        background: C.surface,
        borderRadius:'24px 24px 0 0',
        border:`1px solid ${C.border}`,
        padding:'0 24px 40px',
        transform: mounted && visible ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform 380ms cubic-bezier(0.25,1,0.5,1)',
      }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.surface3, margin:'14px auto 24px' }}/>
        {children}
      </div>
    </div>
  );
};

// ── SparkLine ─────────────────────────────────────────────────────────────────

const SparkLine = ({ data, width=320, height=40 }) => {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const xStep = width / (data.length - 1);
  const pts = data.map((v, i) => [i * xStep, height - ((v - min) / range) * (height - 8) - 4]);
  let path = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0,y0] = pts[i-1], [x1,y1] = pts[i];
    path += ` C${(x0+x1)/2},${y0} ${(x0+x1)/2},${y1} ${x1},${y1}`;
  }
  return (
    <svg width={width} height={height} style={{ display:'block' }}>
      <path d={path} fill="none" stroke={C.accent} strokeWidth={1.5} strokeLinecap="round"/>
      {pts.map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={C.accent} opacity={0.7}/>
      ))}
    </svg>
  );
};

// ── BackgroundCanvas ──────────────────────────────────────────────────────────
const BackgroundCanvas = ({ width = 390, height = 844, simulatedHour = null }) => {
  const ref = React.useRef(null);
  const simRef = React.useRef(simulatedHour);
  React.useEffect(() => { simRef.current = simulatedHour; }, [simulatedHour]);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let raf, frame = 0;

    const computeWB = (h) => {
      if (h >= 4  && h < 7)  return (h - 4) / 3;
      if (h >= 7  && h < 10) return 1 - (h - 7) / 3;
      if (h >= 17 && h < 19) return (19 - h) / 2 * 0.55;
      if (h >= 19 && h < 21) return (21 - h) / 2 * 0.28;
      return 0;
    };

    const blobs = [
      [0.28, 0.22, 0.58, 0.0,  [85, 38, 215],  [220, 100, 18], 0.72],
      [0.72, 0.18, 0.50, 2.1,  [58, 18, 195],  [200,  80, 12], 0.62],
      [0.50, 0.52, 0.54, 4.3,  [38, 12, 165],  [175,  58, 85], 0.52],
      [0.15, 0.38, 0.40, 1.5,  [108, 32, 235], [235, 140, 28], 0.46],
      [0.82, 0.42, 0.36, 3.0,  [68,  22, 185], [185,  68, 12], 0.44],
    ];
    const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

    const draw = () => {
      frame++;
      // Recompute every frame — real-time drift is continuous, sim changes are instant
      const now = new Date();
      const hour = simRef.current !== null
        ? simRef.current
        : now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const wb = computeWB(hour);

      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#07080C';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach(([bx, by, br, ph, night, dawn, ba]) => {
        const sp = 0.00022;
        const x = (bx + Math.sin(frame * sp + ph) * 0.13) * W;
        const y = (by + Math.cos(frame * sp * 0.75 + ph) * 0.10) * H;
        const r = br * Math.min(W, H) * 1.6;
        const [rr, gg, bb] = lerp(night, dawn, wb);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0,   `rgba(${rr},${gg},${bb},${ba})`);
        grad.addColorStop(0.4, `rgba(${rr},${gg},${bb},${ba * 0.42})`);
        grad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      ctx.globalCompositeOperation = 'source-over';
      const vig = ctx.createLinearGradient(0, H * 0.28, 0, H);
      vig.addColorStop(0,    'rgba(7,8,12,0)');
      vig.addColorStop(0.42, 'rgba(7,8,12,0.60)');
      vig.addColorStop(0.72, 'rgba(7,8,12,0.90)');
      vig.addColorStop(1,    'rgba(7,8,12,0.97)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []); // mount once; simRef handles live prop updates

  return (
    <canvas ref={ref} width={width} height={height}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }}/>
  );
};

// ── Export ────────────────────────────────────────────────────────────────────

Object.assign(window, {
  SmallCapsLabel, StatNumber, PrimaryCTA,
  PatchSimulator, ProfileCurve, PhaseTimelineStrip,
  SegmentedControl, DotScale, SessionCard,
  BottomSheet, SparkLine, BackgroundCanvas,
});
