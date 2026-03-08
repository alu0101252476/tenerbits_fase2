/**
 * ═══════════════════════════════════════════════════════════════
 * GEMELO DIGITAL: AMBULANCIA
 *
 * Realizado por Tenerbits
 * (Fase II de los retos HPE CDS)
 * ═══════════════════════════════════════════════════════════════
 */

 const { useState, useEffect, useRef, useCallback } = React;

 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 1: CONSTANTES ──────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 const GRID              = 32;
 const CELL              = 17;
 const PASO              = 4;
 const TICK_MS           = 500;
 
 const TICKS_RAPIDA      = 2;
 const TICKS_LENTA       = 4;
 const TICKS_CONG        = 8;
 const TICKS_OBS_P       = 10;
 const TICKS_COOLDOWN    = 30;
 
 const VEL_MAX_RAPIDA    = 50;
 const VEL_MAX_LENTA     = 30;
 const VEL_MAX_CONG      = 15;
 const VEL_MAX_OBS       = 10;
 const VEL_CAP_TEMP      = 40;
 const VEL_ACELERACION   = 3;
 const VEL_FRENADA       = 5;
 const VEL_CRITICA_BONUS = 20;
 const VEL_LLEGADA       = 15;
 const DIST_FRENADA      = 5;
 
 const TEMP_NORMAL       = 85;
 const TEMP_MAX          = 105;
 
 const RADIO_CONCIENCIA  = 5;
 const INTERVALO_RECALC  = 5;
 
 const CONS_RAPIDA       = 0.20;
 const CONS_LENTA        = 0.30;
 const MULT_CONG         = 1.5;
 const MULT_OBS          = 2.5;
 
 const POLICIA_ADELANTO  = 1;
 const POLICIA_RADIO     = 5;
 
 const UMBRAL_ALTO       = 0.70;
 const UMBRAL_MEDIO      = 0.40;
 const VENTANA_IA        = 30;
 
 const UMBRALES_FALLO = {
   desgaste: [
     { nivel: 70, prob: 0.0015, label: '⚠️ Desgaste moderado' },
     { nivel: 85, prob: 0.006,  label: '🔴 Desgaste alto' },
     { nivel: 95, prob: 0.020,  label: '🚨 Fallo inminente' },
   ],
 };
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 2: TIPOS ───────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 const GRAVEDAD = {
   critica: { label: 'Crítica',  color: '#ef4444', icon: '🔴', slots: 4, baseUrg: 100, timeoutSeg: 60,  slowTicks: 1, velMax: VEL_MAX_RAPIDA + 10 },
   grave:   { label: 'Grave',    color: '#f97316', icon: '🟠', slots: 2, baseUrg: 60,  timeoutSeg: 180, slowTicks: 2, velMax: VEL_MAX_RAPIDA },
   leve:    { label: 'Leve',     color: '#22c55e', icon: '🟢', slots: 1, baseUrg: 10,  timeoutSeg: 999, slowTicks: 0, velMax: VEL_MAX_RAPIDA },
 };
 
 const TIPOS_OBS = {
   accidente:    { color: '#ef4444', icon: '💥', label: 'Accidente',     impasable: true,  radio: 0, duracion: 120 },
   obra:         { color: '#f59e0b', icon: '🚧', label: 'Obra',          impasable: false, radio: 1, duracion: 240 },
   inundacion:   { color: '#3b82f6', icon: '🌊', label: 'Inundación',    impasable: true,  radio: 3, duracion: 360 },
   incendio:     { color: '#f97316', icon: '🔥', label: 'Incendio',      impasable: true,  radio: 2, duracion: 180 },
   manifestacion:{ color: '#a855f7', icon: '📢', label: 'Manifestación', impasable: false, radio: 5, duracion: 480 },
 };
 
 const AMB_ESTADO = {
   libre:      { label: 'Libre',      color: '#38bdf8' },
   en_ruta:    { label: 'En ruta',    color: '#22c55e' },
   averiada:   { label: 'Averiada',   color: '#ef4444' },
   repostando: { label: 'Repostando', color: '#f59e0b' },
   sin_comb:   { label: 'Sin comb.',  color: '#dc2626' },
   parado_sem: { label: 'Sem. rojo',  color: '#f59e0b' },
 };
 
 const MODOS = {
   mover_amb:    { label: 'Mover ambulancia', icon: '🚑', color: '#38bdf8' },
   add_hosp:     { label: 'Añadir hospital',  icon: '🏥', color: '#10b981' },
   add_gas:      { label: 'Añadir gasolinera',icon: '⛽', color: '#f59e0b' },
   add_pac:      { label: 'Añadir paciente',  icon: '🧑‍⚕️',color: '#f97316' },
   add_obs:      { label: 'Añadir obstáculo', icon: '⚠️', color: '#ef4444' },
   add_semaforo: { label: 'Añadir semáforo',  icon: '🚦', color: '#22c55e' },
   add_cong:     { label: 'Zona congestión',  icon: '🔶', color: '#f59e0b' },
   add_calle:    { label: 'Tipo de calle',    icon: '🛣️', color: '#38bdf8' },
   eliminar:     { label: 'Eliminar',         icon: '🗑️', color: '#6b7280' },
 };
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 3: HELPERS ─────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 const uid = () => crypto.randomUUID().slice(0, 8);
 
 function dist(a, b) {
   return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
 }
 
 function puntuacion(p, ahora) {
   return GRAVEDAD[p.gravedad].baseUrg + Math.floor((ahora - (p.llegada ?? 0)) / 10);
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 4: GRID ────────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function generarGridBase(size) {
   return Array.from({ length: size }, (_, r) =>
     Array.from({ length: size }, (_, c) => {
       if (r === 0 || r === size - 1 || c === 0 || c === size - 1) return -1;
       const esCalle = r % PASO === 0 || c % PASO === 0;
       if (!esCalle) return 0;
       return 1;
     })
   );
 }
 
 function generarGrid() {
   const g = generarGridBase(GRID);
   [8, 24].forEach(row => { for (let c = 0; c < GRID; c++) if (g[row][c] > 0) g[row][c] = 2; });
   [8, 24].forEach(col => { for (let r = 0; r < GRID; r++) if (g[r][col] > 0) g[r][col] = 2; });
   return g;
 }
 
 function snapCalle(r, c, grid, size) {
   let best = null, bestD = Infinity;
   for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
     const nr = r + dr, nc = c + dc;
     if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] > 0) {
       const d = Math.abs(dr) + Math.abs(dc);
       if (d < bestD) { bestD = d; best = [nr, nc]; }
     }
   }
   return best ?? [r, c];
 }
 
 function celdasLinea(grid, pos, size) {
   const [r, c] = pos, out = [], seen = new Set();
   const add = ([rr, cc]) => {
     const k = `${rr},${cc}`;
     if (!seen.has(k) && grid[rr][cc] > 0) { seen.add(k); out.push([rr, cc]); }
   };
   if (r % PASO === 0) for (let cc = 0; cc < size; cc++) add([r, cc]);
   if (c % PASO === 0) for (let rr = 0; rr < size; rr++) add([rr, c]);
   if (r % PASO !== 0 && c % PASO !== 0) add([r, c]);
   return out;
 }
 
 function celdasAfectadas(grid, origen, radio, size) {
   const [or, oc] = origen, out = [];
   for (let dr = -radio; dr <= radio; dr++) for (let dc = -radio; dc <= radio; dc++) {
     const nr = or + dr, nc = oc + dc;
     if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] > 0) out.push([nr, nc]);
   }
   return out;
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 5: MINHEAP ─────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 class MinHeap {
   constructor() { this.h = []; }
   push(x) { this.h.push(x); this._up(this.h.length - 1); }
   pop() {
     const t = this.h[0], l = this.h.pop();
     if (this.h.length) { this.h[0] = l; this._down(0); }
     return t;
   }
   get size() { return this.h.length; }
   _up(i) {
     while (i > 0) {
       const p = (i - 1) >> 1;
       if (this.h[p][0] <= this.h[i][0]) break;
       [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
       i = p;
     }
   }
   _down(i) {
     const n = this.h.length;
     for (;;) {
       let s = i, l = 2 * i + 1, r = 2 * i + 2;
       if (l < n && this.h[l][0] < this.h[s][0]) s = l;
       if (r < n && this.h[r][0] < this.h[s][0]) s = r;
       if (s === i) break;
       [this.h[s], this.h[i]] = [this.h[i], this.h[s]];
       i = s;
     }
   }
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 6: PATHFINDING ─────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function aStar(grid, start, end, size, impasables = new Set(), penalizadas = new Map()) {
   if (!start || !end) return [];
   if (grid[start[0]]?.[start[1]] <= 0 || grid[end[0]]?.[end[1]] <= 0) return [];
   if (start[0] === end[0] && start[1] === end[1]) return [start];
 
   const key = (r, c) => `${r},${c}`;
   const h   = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
   const sK  = key(start[0], start[1]);
   const eK  = key(end[0], end[1]);
 
   const open = new MinHeap();
   open.push([h(start, end), 0, start]);
   const cost = { [sK]: 0 };
   const from = {};
 
   while (open.size) {
     const [, g, cur] = open.pop();
     const cK = key(cur[0], cur[1]);
 
     if (cK === eK) {
       const path = []; let k = eK;
       while (k) { const [r2, c2] = k.split(',').map(Number); path.unshift([r2, c2]); k = from[k]; }
       return path;
     }
 
     for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
       const nr = cur[0] + dr, nc = cur[1] + dc, nk = key(nr, nc);
       if (nr < 0 || nr >= size || nc < 0 || nc >= size || grid[nr][nc] <= 0) continue;
       if (impasables.has(nk)) continue;
       let stepCost = grid[nr][nc] === 2 ? 1 : 2;
       if (penalizadas.has(nk)) stepCost += penalizadas.get(nk);
       const ng = g + stepCost;
       if (!(nk in cost) || ng < cost[nk]) {
         cost[nk] = ng;
         open.push([ng + h([nr, nc], end), ng, [nr, nc]]);
         from[nk] = cK;
       }
     }
   }
   return [];
 }
 
 function buildObstacleKnowledge(s, mode = 'local', policiaPos = null) {
   const impasables  = new Set();
   const penalizadas = new Map();
 
   for (const o of s.obstaculos) {
     if (!o.activo) continue;
     const enVentanaAmb = o.celdas.some(([r, c]) =>
       Math.abs(r - s.ambulancia[0]) <= RADIO_CONCIENCIA &&
       Math.abs(c - s.ambulancia[1]) <= RADIO_CONCIENCIA
     );
     const enVentanaPol = policiaPos && o.celdas.some(([r, c]) =>
       Math.abs(r - policiaPos[0]) <= RADIO_CONCIENCIA &&
       Math.abs(c - policiaPos[1]) <= RADIO_CONCIENCIA
     );
     const incluir = mode === 'full' || mode === 'global' ||
       (mode === 'local' && (enVentanaAmb || enVentanaPol));
     if (!incluir) continue;
 
     if (o.impasable) {
       for (const [r, c] of o.celdas) impasables.add(`${r},${c}`);
     } else {
       for (const [r, c] of o.celdas) {
         const k = `${r},${c}`;
         penalizadas.set(k, Math.max(penalizadas.get(k) ?? 0, 20));
       }
     }
   }
 
   for (const z of s.zonasCongesion) {
     const enVentanaAmb = z.celdas.some(([r, c]) =>
       Math.abs(r - s.ambulancia[0]) <= RADIO_CONCIENCIA &&
       Math.abs(c - s.ambulancia[1]) <= RADIO_CONCIENCIA
     );
     const enVentanaPol = policiaPos && z.celdas.some(([r, c]) =>
       Math.abs(r - policiaPos[0]) <= RADIO_CONCIENCIA &&
       Math.abs(c - policiaPos[1]) <= RADIO_CONCIENCIA
     );
     if (mode === 'local' && !enVentanaAmb && !enVentanaPol) continue;
     for (const [r, c] of z.celdas) {
       const k = `${r},${c}`;
       penalizadas.set(k, Math.max(penalizadas.get(k) ?? 0, 10));
     }
   }
 
   return { impasables, penalizadas };
 }
 
 function calcVerdeEnTick(sem, tick) {
   const total = sem.cicloA + sem.cicloB;
   const fase  = tick % total;
   return sem.fase === 'A' ? fase < sem.cicloA : fase >= sem.cicloA;
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 7: IA ──────────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 class IAambulancia {
   constructor() { this.vVel = []; this.vTemp = []; }
 
   _z(v, x) {
     if (v.length < 5) return false;
     const m = v.reduce((a, b) => a + b, 0) / v.length;
     const s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
     return s > 0 && Math.abs((x - m) / s) > 2.5;
   }
 
   predecirFallo(desgaste) {
     for (const u of [...UMBRALES_FALLO.desgaste].reverse()) {
       if (desgaste >= u.nivel) {
         const horizonte = u.prob > 0 ? Math.round(1 / u.prob) : 9999;
         return { prob: Math.min(1, u.prob * 100), horizonte, label: u.label };
       }
     }
     return { prob: 0, horizonte: 9999, label: '✅ Sin riesgo de fallo' };
   }
 
   evaluar(vel, temp, cooldown, modoCritico, desgaste, tick) {
     this.vVel.push(vel);  if (this.vVel.length  > VENTANA_IA) this.vVel.shift();
     this.vTemp.push(temp); if (this.vTemp.length > VENTANA_IA) this.vTemp.shift();
 
     const ratioTemp   = Math.min(1, Math.max(0, (temp - TEMP_NORMAL) / (TEMP_MAX - TEMP_NORMAL)));
     const fracVelAlt  = this.vVel.length > 0 ? this.vVel.filter(v => v > 40).length / this.vVel.length : 0;
     const rSc         = Math.min(1, 0.50 * ratioTemp + 0.35 * fracVelAlt + 0.15 * (cooldown > 0 ? 1 : 0));
     const aV          = this._z(this.vVel, vel);
     const aT          = this._z(this.vTemp, temp);
     const rG          = Math.min(1, 0.70 * rSc + 0.15 * (aV ? 1 : 0) + 0.15 * (aT ? 1 : 0));
     const fallo       = this.predecirFallo(desgaste);
 
     let rec = '✅ Sistemas normales.';
     if (rG >= UMBRAL_ALTO)                    rec = `🚨 Riesgo alto (${(rG * 100).toFixed(0)}%) — reducir velocidad`;
     else if (aT && !modoCritico)              rec = `⚠️ Temp. anómala (${temp.toFixed(1)}°C)`;
     else if (aV && rG >= UMBRAL_MEDIO)        rec = `⚠️ Patrón velocidad inusual`;
     else if (modoCritico && rG >= UMBRAL_MEDIO) rec = `⚡ Crítico a bordo: equilibrar vel./motor`;
     else if (fallo.prob > 10)                 rec = `${fallo.label} — fallo en ~${fallo.horizonte}t`;
 
     return { rG, rec, aV, aT, fallo };
   }
 
   reset() { this.vVel = []; this.vTemp = []; }
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 8: PLANNER ─────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function planificarMision({
   ambPos, combustible, desgaste, temp, cooldown,
   pacientes, hospitales, gasolineras, capacidad,
   obsLocales, semRojosLocales, congLocales, tick,
 }) {
   const wps = [], log = [], eventos = [];
 
   if (combustible <= 0) {
     log.push('🚨 Sin combustible — inmovilizada.');
     eventos.push({ tipo: 'COMBUSTIBLE_AGOTADO', payload: { combustible } });
     return { wps: [], log, eventos };
   }
 
   const pendientes = pacientes.filter(p => p.estado === 'esperando');
   const abordo     = pacientes.filter(p => p.estado === 'abordo');
   const slotsUs    = abordo.reduce((s, p) => s + GRAVEDAD[p.gravedad].slots, 0);
   const slotsLib   = capacidad - slotsUs;
   const modoCrit   = abordo.some(p => p.gravedad === 'critica');
 
   if (temp >= TEMP_MAX || cooldown > 0)
     log.push(`🌡️ Motor ${temp.toFixed(1)}°C${cooldown > 0 ? ` · cooldown ${cooldown}t` : ' SOBRECALENTADO'}`);
   if (desgaste > 70) log.push(`⚠️ Desgaste: ${desgaste.toFixed(0)}%`);
   if (obsLocales.length > 0)
     log.push(`👁️ ${obsLocales.filter(o => o.impasable).length} obstáculo(s) impasable(s) en ventana`);
   if (semRojosLocales.length > 0)
     log.push(`👁️ ${semRojosLocales.length} semáforo(s) rojo en ventana`);
   if (congLocales.length > 0)
     log.push(`👁️ ${congLocales.length} zona(s) congestión detectadas`);
 
   const gasDisp = gasolineras.filter(g => !g.ocupada);
   let gasCerc = null, distGas = 9999;
   for (const g of gasDisp) { const d = dist(ambPos, g.pos); if (d < distGas) { distGas = d; gasCerc = g; } }
 
   const MARGEN     = congLocales.length > 0 || obsLocales.length > 0 ? 1.7 : 1.35;
   const combGas    = distGas * 0.32;
   const umbralRepo = gasCerc ? combGas * MARGEN + 15 : 999;
   const puedeGas   = gasCerc && combustible > combGas * 1.02;
 
   if (gasCerc) log.push(`⛽ ${combustible.toFixed(1)}% · umbral repostaje: ${umbralRepo.toFixed(1)}%`);
   else         log.push(`⛽ ${combustible.toFixed(1)}% · sin gasolineras`);
 
   const needsRepo = puedeGas && combustible <= umbralRepo;
 
   if (needsRepo && abordo.length === 0) {
     wps.push({ tipo: 'gasolinera', id: gasCerc.id, pos: gasCerc.pos });
     log.push('⛽ REPOSTAJE PROACTIVO');
     eventos.push({ tipo: 'COMBUSTIBLE_BAJO', payload: { combustible } });
     return { wps, log, eventos };
   }
 
   const hospLib    = hospitales.filter(h => !h.saturado);
   const criticos   = pendientes.filter(p => p.gravedad === 'critica')
     .sort((a, b) => puntuacion(b, tick) - puntuacion(a, tick));
   const criticoTop = criticos[0] ?? null;
   const sinSlots   = criticoTop && slotsLib < GRAVEDAD.critica.slots && abordo.length > 0;
 
   if (sinSlots && hospLib.length > 0) {
     const hEmerg = hospLib.reduce((b, h) => dist(ambPos, h.pos) < dist(ambPos, b.pos) ? h : b);
     const hFinal = hospLib.reduce((b, h) => dist(criticoTop.pos, h.pos) < dist(criticoTop.pos, b.pos) ? h : b);
     wps.push({ tipo: 'hospital', id: hEmerg.id, pos: hEmerg.pos });
     wps.push({ tipo: 'paciente', id: criticoTop.id, pos: criticoTop.pos, gravedad: 'critica' });
     wps.push({ tipo: 'hospital', id: hFinal.id, pos: hFinal.pos });
     log.push('🔴 Sin slots — descarga urgente → crítico');
     eventos.push({ tipo: 'MISION_INTERRUMPIDA_CRITICO', payload: { id: criticoTop.id } });
     return { wps, log, eventos };
   }
 
   let plan = [], posS = ambPos, slotsS = slotsLib;
   let rest = [...pendientes];
   const slotsCrit = Math.min(GRAVEDAD.critica.slots, capacidad);
 
   if (criticoTop && slotsS >= slotsCrit) {
     plan.push(criticoTop);
     slotsS -= slotsCrit; posS = criticoTop.pos;
     rest = rest.filter(p => p.id !== criticoTop.id);
     log.push('🔴 Crítico → primera parada');
   }
 
   const tieneCrit = plan.some(p => p.gravedad === 'critica') || abordo.some(p => p.gravedad === 'critica');
 
   while (slotsS > 0 && rest.length > 0) {
     let mejor = null, bestScore = -Infinity;
     for (const p of rest) {
       const req = GRAVEDAD[p.gravedad].slots;
       if (req > slotsS) continue;
       if (tieneCrit && dist(posS, p.pos) > 8) continue;
       const score = (GRAVEDAD[p.gravedad].baseUrg + Math.floor((tick - (p.llegada ?? 0)) / 10)) / req;
       if (score > bestScore) { bestScore = score; mejor = p; }
     }
     if (!mejor) break;
     plan.push(mejor);
     slotsS -= GRAVEDAD[mejor.gravedad].slots;
     posS = mejor.pos;
     rest = rest.filter(p => p.id !== mejor.id);
   }
 
   if (hospLib.length === 0 && (abordo.length > 0 || plan.length > 0)) {
     log.push('🏥 Hospitales saturados — esperando');
     eventos.push({ tipo: 'HOSPITAL_SATURADO', payload: {} });
     return { wps, log, eventos };
   }
 
   let hospDest = null;
   if (hospLib.length > 0 && (abordo.length > 0 || plan.length > 0))
     hospDest = hospLib.reduce((b, h) => dist(posS, h.pos) < dist(posS, b.pos) ? h : b);
 
   while (plan.length > 0) {
     let combNec = 0, cur = ambPos;
     for (const p of plan) { combNec += dist(cur, p.pos) * 0.35; cur = p.pos; }
     if (hospDest) combNec += dist(cur, hospDest.pos) * 0.35;
     if (combustible >= combNec * MARGEN) break;
     plan.pop();
     const np = plan.length > 0 ? plan[plan.length - 1].pos : ambPos;
     hospDest = hospLib.length > 0 ? hospLib.reduce((b, h) => dist(np, h.pos) < dist(np, b.pos) ? h : b) : null;
   }
 
   if (abordo.length > 0 || plan.length > 0) {
     let combMis = 0, cur = ambPos;
     for (const p of plan) { combMis += dist(cur, p.pos) * 0.35; cur = p.pos; }
     if (hospDest) combMis += dist(cur, hospDest.pos) * 0.35;
 
     if (needsRepo && puedeGas && combustible > combGas * 1.02) {
       wps.push({ tipo: 'gasolinera', id: gasCerc.id, pos: gasCerc.pos });
       log.push('⛽ Repostaje intermedio');
       eventos.push({ tipo: 'COMBUSTIBLE_BAJO', payload: { combustible } });
     }
     plan.forEach(p => wps.push({ tipo: 'paciente', id: p.id, pos: p.pos, gravedad: p.gravedad }));
     if (hospDest) wps.push({ tipo: 'hospital', id: hospDest.id, pos: hospDest.pos });
 
     if (abordo.length > 0 && hospDest && !wps.some(w => w.tipo === 'gasolinera')) {
       const cH = dist(ambPos, hospDest.pos) * 0.35;
       if (puedeGas && combustible < cH * MARGEN) {
         wps.unshift({ tipo: 'gasolinera', id: gasCerc.id, pos: gasCerc.pos });
         log.push('⛽ Repostaje urgente — insuf. para hospital');
         eventos.push({ tipo: 'COMBUSTIBLE_BAJO', payload: { combustible } });
       }
     }
 
     if (plan.length > 1) log.push(`✅ Misión multi-parada: ${plan.length} recogidas`);
     else if (plan.length === 1) log.push(`✅ Recogida: ${GRAVEDAD[plan[0].gravedad].label}`);
     else log.push(`🏥 Entregando ${abordo.length} paciente(s)`);
   } else {
     if (needsRepo && puedeGas) {
       wps.push({ tipo: 'gasolinera', id: gasCerc.id, pos: gasCerc.pos });
       log.push('⛽ Repostaje preventivo en espera');
       eventos.push({ tipo: 'COMBUSTIBLE_BAJO', payload: { combustible } });
     } else if (pendientes.length === 0) {
       log.push('🔄 En espera de pacientes');
     } else if (puedeGas) {
       wps.push({ tipo: 'gasolinera', id: gasCerc.id, pos: gasCerc.pos });
       log.push('⛽ Repostaje obligatorio antes de misión');
       eventos.push({ tipo: 'COMBUSTIBLE_BAJO', payload: { combustible } });
     }
   }
 
   const planIds  = new Set(plan.map(p => p.id));
   const sinCob   = criticos.filter(p => !planIds.has(p.id));
   if (sinCob.length > 0) {
     eventos.push({ tipo: 'CRITICO_SIN_COBERTURA', payload: { total: sinCob.length } });
     log.push(`🆘 ${sinCob.length} crítico(s) sin cobertura`);
   }
 
   return { wps, log, eventos };
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 9: ESTADO INICIAL ──────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function makeGrid() { return generarGrid(); }
 
 function makeInitState(g) {
   const snapG = (r, c) => snapCalle(r, c, g, GRID);
   return {
     grid: g,
     ambulancia: snapG(4, 4),
     capacidad: 4,
     ambEstado: 'libre',
     combustible: 100,
     desgaste: 0,
     kmRecorridos: 0,
     misionesOk: 0,
     tiempoAveria: 0,
     tiempoRepost: 0,
     velocidad: 0,
     velObjetivo: 0,
     temperatura: TEMP_NORMAL,
     segsCaliente: 0,
     segsFrio: 0,
     cooldown: 0,
     tickCelda: 0,
     enCongestion: false,
     enSemRojo: false,
     hospitales: [
       { id: uid(), pos: snapG(4, GRID - 5),  saturado: false, capacidadMax: 10, ocupacion: 0, satDesde: null },
       { id: uid(), pos: snapG(GRID - 5, 4),  saturado: false, capacidadMax: 10, ocupacion: 0, satDesde: null },
     ],
     gasolineras: [
       { id: uid(), pos: snapG(16, 16), ocupada: false },
       { id: uid(), pos: snapG(8, 24),  ocupada: false },
     ],
     pacientes: [],
     obstaculos: [
       { id: uid(), tipo: 'accidente',  origen: [12, 16], celdas: [[12, 16]],                            impasable: true,  llegada: 0, duracion: -1, activo: true },
       { id: uid(), tipo: 'incendio',   origen: [20, 8],  celdas: celdasAfectadas(g, [20, 8],  2, GRID), impasable: true,  llegada: 0, duracion: -1, activo: true },
       { id: uid(), tipo: 'obra',       origen: [4, 16],  celdas: celdasAfectadas(g, [4, 16],  1, GRID), impasable: false, llegada: 0, duracion: -1, activo: true },
     ],
     semaforos: [
       { id: uid(), pos: snapG(8,  8),  verde: true,  cicloA: 15, cicloB: 15, fase: 'A' },
       { id: uid(), pos: snapG(8,  24), verde: false, cicloA: 15, cicloB: 15, fase: 'B' },
       { id: uid(), pos: snapG(24, 8),  verde: false, cicloA: 20, cicloB: 10, fase: 'B' },
       { id: uid(), pos: snapG(24, 24), verde: true,  cicloA: 20, cicloB: 10, fase: 'A' },
       { id: uid(), pos: snapG(16, 16), verde: true,  cicloA: 12, cicloB: 18, fase: 'A' },
       { id: uid(), pos: snapG(16, 8),  verde: false, cicloA: 10, cicloB: 20, fase: 'B' },
     ],
     zonasCongesion: [],
     ruta: [],
     mision: [],
     tick: 0,
     razonIA: [],
     riesgoIA: 0,
     iaRec: '',
     iaFallo: null,
     alertasIA: [],
     eventosEco: [],
     recalcCount: 0,
     policiaActivo: false,
     policiaPos: null,
     policiaCeldasRapidas: [],
     policiaSemForzados: [],
     policiaConqDespejadas: [],
     logEv: [],
     logTel: [],
   };
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 10: EXPORTAR JSON ──────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 // FIX-5: setTimeout antes de revokeObjectURL para evitar race condition en Firefox
 function exportarJSON(datos, nombreFichero) {
   const contenido = JSON.stringify(datos, null, 2);
   const blob = new Blob([contenido], { type: 'application/json' });
   const url  = URL.createObjectURL(blob);
   const a    = document.createElement('a');
   a.href = url; a.download = nombreFichero; a.click();
   setTimeout(() => URL.revokeObjectURL(url), 150);
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 11: HOOK ───────────────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function useSimulation() {
   const gridRef = useRef(makeGrid());
   const sim     = useRef(null);
   if (!sim.current) sim.current = makeInitState(gridRef.current);
   const ia      = useRef(new IAambulancia());
 
   const [, setRT] = useState(0);
   const render = useCallback(() => setRT(t => t + 1), []);
 
   const [modo,          setModo]          = useState('mover_amb');
   const [gravedadSel,   setGravedadSel]   = useState('leve');
   const [tipoObs,       setTipoObs]       = useState('accidente');
   const [durObs,        setDurObs]        = useState(120);
   const [obsIndefin,    setObsIndefin]    = useState(false);
   const [semCicloA,     setSemCicloA]     = useState(15);
   const [semCicloB,     setSemCicloB]     = useState(15);
   const [semFase,       setSemFase]       = useState('A');
   const [radioCong,     setRadioCong]     = useState(3);
   const [tipoCalle,     setTipoCalle]     = useState('rapida');
   const [hover,         setHover]         = useState(null);
   const [tabDer,        setTabDer]        = useState('ia');
   const [tabLog,        setTabLog]        = useState('eventos');
   const [running,       setRunning]       = useState(false);
   const [policiaEnabled,setPoliciaEnabled]= useState(false);
 
   const intRef = useRef(null);
   const runRef = useRef(false);
 
   useEffect(() => {
     const s = sim.current;
     const g = gridRef.current;
     if (policiaEnabled) {
       s.policiaActivo = true;
     } else {
       s.policiaCeldasRapidas.forEach(([pr, pc, orig]) => {
         if (g[pr] && g[pr][pc] !== undefined) g[pr][pc] = orig;
       });
       s.policiaSemForzados.forEach(sid => {
         const sem = s.semaforos.find(se => se.id === sid);
         if (sem) {
           sem._forzadoVerde = false;
           sem.verde = calcVerdeEnTick(sem, s.tick);
         }
       });
       s.zonasCongesion.push(...s.policiaConqDespejadas);
       s.policiaCeldasRapidas    = [];
       s.policiaSemForzados      = [];
       s.policiaConqDespejadas   = [];
       s.policiaActivo           = false;
       s.policiaPos              = null;
     }
   }, [policiaEnabled]);
 
   const addLog = useCallback((msg, imp = false) => {
     const s = sim.current;
     s.logEv = [{ t: s.tick, msg, imp }, ...s.logEv].slice(0, 120);
   }, []);
 
   const addTel = useCallback(() => {
     const s = sim.current;
     if (s.logTel.length < 400)
       s.logTel = [{
         t: s.tick, estado: s.ambEstado, pos: [...s.ambulancia],
         vel:  +s.velocidad.toFixed(1),  comb: +s.combustible.toFixed(1),
         temp: +s.temperatura.toFixed(1), desg: +s.desgaste.toFixed(1),
         riesg: +s.riesgoIA.toFixed(3),
       }, ...s.logTel];
   }, []);
 
   const getConciencia = useCallback(() => {
     const s = sim.current;
     const [ar, ac] = s.ambulancia;
     const cerca = (r, c) => Math.abs(r - ar) <= RADIO_CONCIENCIA && Math.abs(c - ac) <= RADIO_CONCIENCIA;
     const obsL    = s.obstaculos.filter(o => o.activo && o.celdas.some(([r, c]) => cerca(r, c)));
     const semRojL = s.semaforos.filter(sem => !sem.verde && cerca(sem.pos[0], sem.pos[1]));
     const congL   = s.zonasCongesion.filter(z => z.celdas.some(([r, c]) => cerca(r, c)));
     return { obsL, semRojL, congL };
   }, []);
 
   const calcularRuta = useCallback((desde, hasta) => {
     const s = sim.current;
     const polPos = s.policiaActivo ? s.policiaPos : null;
     const { impasables, penalizadas } = buildObstacleKnowledge(s, 'local', polPos);
     return aStar(gridRef.current, desde, hasta, GRID, impasables, penalizadas);
   }, []);
 
   const actualizarAlertasIA = useCallback(() => {
     const s = sim.current;
     const alertas = [];
 
     if (s.temperatura >= TEMP_MAX) {
       alertas.push({ id: 'sobrecalent', nivel: 'critico', icon: '🌡️', titulo: 'Motor sobrecalentado',
         detalle: `${s.temperatura.toFixed(1)}°C — por encima del límite de ${TEMP_MAX}°C`, color: '#ef4444' });
     } else if (s.cooldown > 0) {
       alertas.push({ id: 'cooldown', nivel: 'alto', icon: '🌡️', titulo: 'Cooldown de motor activo',
         detalle: `Temperatura ${s.temperatura.toFixed(1)}°C · Velocidad cap. ${VEL_CAP_TEMP}km/h · ${s.cooldown}t restantes`, color: '#f97316' });
     }
 
     if (s.recalcCount >= 3) {
       alertas.push({ id: 'recalc', nivel: 'medio', icon: '🔄', titulo: 'Recálculos de ruta frecuentes',
         detalle: `${s.recalcCount} recálculos detectados — posibles obstáculos dinámicos en la zona`, color: '#a855f7' });
     }
 
     const umbralDesgaste = UMBRALES_FALLO.desgaste.slice().reverse().find(u => s.desgaste >= u.nivel);
     if (umbralDesgaste) {
       alertas.push({ id: 'desgaste',
         nivel: s.desgaste >= 95 ? 'critico' : s.desgaste >= 85 ? 'alto' : 'medio',
         icon: '🔩', titulo: 'Desgaste mecánico elevado',
         detalle: `${s.desgaste.toFixed(0)}% · ${umbralDesgaste.label} · P(fallo/t)=${(umbralDesgaste.prob * 100).toFixed(2)}%`,
         color: s.desgaste >= 95 ? '#ef4444' : s.desgaste >= 85 ? '#f97316' : '#f59e0b' });
     }
 
     if (s.riesgoIA >= UMBRAL_ALTO) {
       alertas.push({ id: 'riesgo_alto', nivel: 'alto', icon: '🚨', titulo: 'Riesgo operacional alto',
         detalle: `Índice de riesgo IA: ${(s.riesgoIA * 100).toFixed(0)}% — reducir velocidad o parar`, color: '#ef4444' });
     } else if (s.riesgoIA >= UMBRAL_MEDIO) {
       alertas.push({ id: 'riesgo_medio', nivel: 'medio', icon: '⚠️', titulo: 'Riesgo operacional moderado',
         detalle: `Índice de riesgo IA: ${(s.riesgoIA * 100).toFixed(0)}% — vigilar estado del vehículo`, color: '#f59e0b' });
     }
 
     s.alertasIA = alertas;
   }, []);
 
   const invocarIA = useCallback((forzar = true) => {
     const s = sim.current;
     const { obsL, semRojL, congL } = getConciencia();
 
     const { wps, log, eventos } = planificarMision({
       ambPos: s.ambulancia, combustible: s.combustible, desgaste: s.desgaste,
       temp: s.temperatura, cooldown: s.cooldown, pacientes: s.pacientes,
       hospitales: s.hospitales, gasolineras: s.gasolineras, capacidad: s.capacidad,
       obsLocales: obsL, semRojosLocales: semRojL, congLocales: congL, tick: s.tick,
     });
 
     s.razonIA    = log;
     s.eventosEco = [...eventos.map(e => ({ ...e, t: s.tick })), ...s.eventosEco].slice(0, 40);
     eventos.forEach(e => addLog(`📡 ${e.tipo}`));
 
     if (wps.length === 0) {
       if (s.combustible <= 0) s.ambEstado = 'sin_comb';
       else if (s.ambEstado === 'en_ruta') s.ambEstado = 'libre';
       s.ruta = []; s.mision = [];
       return;
     }
 
     if (!forzar) {
       const ids  = new Set(s.mision.map(w => w.id));
       const idsN = new Set(wps.map(w => w.id));
       if (ids.size === idsN.size && [...ids].every(i => idsN.has(i)) && wps[0]?.id === s.mision[0]?.id) return;
     }
 
     const path = calcularRuta(s.ambulancia, wps[0].pos);
     if (path.length > 0) {
       s.mision = wps; s.ruta = path;
       s.velObjetivo = 0; s.ambEstado = 'en_ruta';
     } else {
       addLog(`🛑 Sin ruta hacia ${wps[0].tipo} — obstáculos bloqueantes`);
       s.ambEstado = 'libre'; s.ruta = []; s.mision = [];
     }
   }, [getConciencia, calcularRuta, addLog]);
 
   // ═══════════════════════════════════════════════════════════════
   // BUCLE PRINCIPAL
   // ═══════════════════════════════════════════════════════════════
   // eslint-disable-next-line react-hooks/exhaustive-deps
   useEffect(() => {
     runRef.current = running;
     if (!running) { clearInterval(intRef.current); return; }
 
     intRef.current = setInterval(() => {
       if (!runRef.current) return;
       const s = sim.current;
       const g = gridRef.current;
       s.tick += 1;
       const t = s.tick;
 
       // 1) SEMÁFOROS
       let semCambio = false;
       s.semaforos = s.semaforos.map(sem => {
         if (sem._forzadoVerde) return sem;
         const total = sem.cicloA + sem.cicloB;
         const fase  = t % total;
         const eraV  = sem.verde;
         const esV   = sem.fase === 'A' ? fase < sem.cicloA : fase >= sem.cicloA;
         if (eraV !== esV) {
           semCambio = true;
           addLog(`🚦 Semáforo (${sem.pos[0]},${sem.pos[1]}) → ${esV ? 'VERDE 🟢' : 'ROJO 🔴'}`);
         }
         return { ...sem, verde: esV };
       });
 
       // 2) OBSTÁCULOS
       s.obstaculos = s.obstaculos.map(o => {
         if (!o.activo || o.duracion < 0) return o;
         if (t >= o.llegada + o.duracion) {
           addLog(`⏰ ${TIPOS_OBS[o.tipo].label} en (${o.origen[0]},${o.origen[1]}) expiró`);
           return { ...o, activo: false };
         }
         return o;
       });
 
       // 3) DESATURACIÓN HOSPITALES
       s.hospitales = s.hospitales.map(h => {
         if (h.saturado && h.satDesde !== null && t - h.satDesde >= 150) {
           addLog('🏥 Hospital disponible de nuevo');
           return { ...h, saturado: false, satDesde: null };
         }
         return h;
       });
 
       // 4) ESCALADA DE GRAVEDAD
       s.pacientes = s.pacientes.map(p => {
         if (p.estado !== 'esperando') return p;
         const esp = t - (p.llegada ?? 0);
         const esc = { leve: 'grave', grave: 'critica' };
         if (esp >= GRAVEDAD[p.gravedad].timeoutSeg && esc[p.gravedad]) {
           const nueva = esc[p.gravedad];
           addLog(`⬆️ Paciente: ${GRAVEDAD[p.gravedad].label} → ${GRAVEDAD[nueva].label}`, nueva === 'critica');
           return { ...p, gravedad: nueva, llegada: t };
         }
         return p;
       });
 
       if (semCambio) invocarIA(false);
 
       // 5) ESTADOS ESPECIALES
       const est = s.ambEstado;
       if (est === 'sin_comb') {
         if (t % 20 === 0) { addLog('🛑 Sin combustible — inmovilizada'); invocarIA(true); }
         addTel(); actualizarAlertasIA(); render(); return;
       }
       if (est === 'averiada') {
         s.tiempoAveria--;
         if (s.tiempoAveria <= 0) {
           addLog('🔧 Reparación completada', true);
           s.ambEstado = 'libre'; s.tiempoAveria = 0; s.velocidad = 0; s.velObjetivo = 0;
           s.desgaste = Math.max(0, s.desgaste - 40);
           invocarIA(true);
         }
         addTel(); actualizarAlertasIA(); render(); return;
       }
       if (est === 'repostando') {
         s.tiempoRepost--;
         if (s.tiempoRepost <= 0) {
           addLog('✅ Repostaje completo', true);
           s.ambEstado = 'libre'; s.tiempoRepost = 0;
           s.combustible = 100; s.velocidad = 0; s.velObjetivo = 0;
           s.gasolineras = s.gasolineras.map(gg => ({ ...gg, ocupada: false }));
           invocarIA(true);
         }
         addTel(); actualizarAlertasIA(); render(); return;
       }
 
       if (s.combustible <= 0) {
         addLog('🛑 COMBUSTIBLE AGOTADO', true);
         s.ambEstado = 'sin_comb'; s.ruta = []; s.mision = []; s.velocidad = 0; s.velObjetivo = 0;
         invocarIA(true); addTel(); actualizarAlertasIA(); render(); return;
       }
 
       // 6) CONCIENCIA LOCAL
       const { obsL, semRojL, congL } = getConciencia();
       const pk = `${s.ambulancia[0]},${s.ambulancia[1]}`;
       s.enCongestion = congL.some(z => z.celdas.some(([r, c]) => `${r},${c}` === pk));
       const semEnPos = s.semaforos.find(sem => `${sem.pos[0]},${sem.pos[1]}` === pk);
       s.enSemRojo    = !!(semEnPos && !semEnPos.verde);
 
       if (t % INTERVALO_RECALC === 0) invocarIA(false);
 
       // 7) SEMÁFORO ROJO
       let velCapSem = Infinity;
       {
         const SEM_LOOKAHEAD = Math.min(RADIO_CONCIENCIA, s.ruta.length - 1);
         let semRojoIdx = -1;
         for (let i = 1; i <= SEM_LOOKAHEAD; i++) {
           const celda = s.ruta[i];
           if (!celda) break;
           const semCandidate = s.semaforos.find(
             sem => sem.pos[0] === celda[0] && sem.pos[1] === celda[1]
           );
           const enVentana =
             semCandidate &&
             Math.abs(semCandidate.pos[0] - s.ambulancia[0]) <= RADIO_CONCIENCIA &&
             Math.abs(semCandidate.pos[1] - s.ambulancia[1]) <= RADIO_CONCIENCIA;
           if (semCandidate && !semCandidate.verde && enVentana) {
             semRojoIdx = i;
             break;
           }
         }
 
         if (semRojoIdx === 1) {
           if (est !== 'parado_sem') addLog(`🚦 Semáforo rojo — parando en (${s.ruta[1][0]},${s.ruta[1][1]})`);
           s.ambEstado = 'parado_sem'; s.velObjetivo = 0;
           s.velocidad = Math.max(0, s.velocidad - VEL_FRENADA);
           addTel(); actualizarAlertasIA(); render(); return;
         } else if (semRojoIdx > 1) {
           const factorSem = (semRojoIdx - 1) / (SEM_LOOKAHEAD - 1 || 1);
           velCapSem = Math.max(0, VEL_LLEGADA * factorSem);
           if (est === 'parado_sem') {
             addLog('🚦 Semáforo verde — reanudando');
             s.ambEstado = 'en_ruta'; s.velObjetivo = 0;
           }
         } else {
           if (est === 'parado_sem') {
             addLog('🚦 Semáforo verde — reanudando');
             s.ambEstado = 'en_ruta'; s.velObjetivo = 0;
           }
         }
       }
 
       // 8) OBSTÁCULO IMPASABLE
       if (s.ruta.length > 1) {
         const sig  = s.ruta[1];
         const sigK = `${sig[0]},${sig[1]}`;
         const obsBloquea = s.obstaculos.find(o =>
           o.activo && o.impasable && o.celdas.some(([r, c]) => `${r},${c}` === sigK)
         );
         const enVentSig = Math.abs(sig[0] - s.ambulancia[0]) <= RADIO_CONCIENCIA &&
           Math.abs(sig[1] - s.ambulancia[1]) <= RADIO_CONCIENCIA;
         if (obsBloquea && enVentSig) {
           addLog(`🛑 Obstáculo ${TIPOS_OBS[obsBloquea.tipo].label} detectado — recalculando ruta`);
           const wp = s.mision[0];
           if (wp) {
             const nuevaRuta = calcularRuta(s.ambulancia, wp.pos);
             if (nuevaRuta.length > 0) {
               addLog(`🔄 Ruta recalculada evitando obstáculo (${nuevaRuta.length} celdas)`);
               s.ruta = nuevaRuta; s.velObjetivo = 0;
               s.recalcCount = (s.recalcCount || 0) + 1;
             } else {
               addLog('⚠️ Sin ruta alternativa — esperando');
               s.ambEstado = 'libre'; s.ruta = []; s.mision = [];
               invocarIA(true);
             }
           }
           addTel(); actualizarAlertasIA(); render(); return;
         }
       }
 
       // 9) FÍSICA DEL MOTOR
       if (s.velocidad > 40) {
         s.segsCaliente++; s.segsFrio = 0;
         if (s.segsCaliente >= 5) s.temperatura = Math.min(115, s.temperatura + 0.5);
       } else {
         s.segsFrio++; s.segsCaliente = 0;
         if (s.segsFrio >= 5) s.temperatura = Math.max(TEMP_NORMAL, s.temperatura - 2);
       }
       if (s.temperatura > TEMP_MAX && s.cooldown === 0) {
         s.cooldown = TICKS_COOLDOWN;
         addLog(`🌡️ Motor sobrecalentado (${s.temperatura.toFixed(1)}°C)`, true);
       }
       if (s.cooldown > 0 && s.temperatura <= TEMP_MAX) s.cooldown = Math.max(0, s.cooldown - 1);
 
       // 10) EVALUACIÓN IA
       const abordoA  = s.pacientes.filter(p => p.estado === 'abordo');
       const modoCrit = abordoA.some(p => p.gravedad === 'critica');
       const evalIA   = ia.current.evaluar(s.velocidad, s.temperatura, s.cooldown, modoCrit, s.desgaste, t);
       s.riesgoIA     = evalIA.rG;
       s.iaRec        = evalIA.rec;
       s.iaFallo      = evalIA.fallo;
       if (evalIA.rG >= UMBRAL_ALTO && t % 15 === 0) addLog(`🧠 IA: ${evalIA.rec}`, true);
       if (evalIA.fallo.prob > 15 && t % 30 === 0)    addLog(`🔮 Predicción: ${evalIA.fallo.label}`, true);
       actualizarAlertasIA();
 
       // 11) FÍSICA DE VELOCIDAD
       const sigCelda = s.ruta.length > 1 ? s.ruta[1] : null;
       if (sigCelda && s.ambEstado === 'en_ruta') {
         const tipoSig = g[sigCelda[0]][sigCelda[1]];
         let velTgt    = tipoSig === 2 ? VEL_MAX_RAPIDA : VEL_MAX_LENTA;
         if (s.enCongestion) velTgt = VEL_MAX_CONG;
         const sigK = `${sigCelda[0]},${sigCelda[1]}`;
         const obsP = s.obstaculos.find(o => o.activo && !o.impasable && o.celdas.some(([r, c]) => `${r},${c}` === sigK));
         if (obsP) velTgt = s.policiaActivo ? Math.round(VEL_MAX_OBS * 1.5) : VEL_MAX_OBS;
         if (s.cooldown > 0 || s.temperatura >= TEMP_MAX) velTgt = Math.min(velTgt, VEL_CAP_TEMP);
 
         if (modoCrit) {
           velTgt = Math.min(velTgt + VEL_CRITICA_BONUS, VEL_MAX_RAPIDA + VEL_CRITICA_BONUS);
         } else {
           const slowPen = abordoA.length > 0 ? Math.max(...abordoA.map(p => GRAVEDAD[p.gravedad].slowTicks)) : 0;
           if (slowPen > 0) velTgt = Math.max(20, velTgt - slowPen * 8);
         }
 
         const distWp = s.ruta.length - 1;
         if (distWp > 0 && distWp <= DIST_FRENADA) {
           const factorFreno = distWp / DIST_FRENADA;
           const velFreno    = VEL_LLEGADA + (velTgt - VEL_LLEGADA) * factorFreno;
           velTgt = Math.min(velTgt, velFreno);
         }
 
         s.velObjetivo = Math.min(velTgt, velCapSem);
       } else {
         s.velObjetivo = 0;
       }
 
       const diff = s.velObjetivo - s.velocidad;
       if (diff > 0) s.velocidad = Math.min(s.velObjetivo, s.velocidad + VEL_ACELERACION);
       else if (diff < 0) s.velocidad = Math.max(s.velObjetivo, s.velocidad - VEL_FRENADA);
       s.velocidad = Math.max(0, s.velocidad + (Math.random() - 0.5) * 0.5);
 
       // 12) AVANCE DE CELDA
       if (s.ruta.length <= 1 || s.ambEstado === 'parado_sem') {
         if (s.ruta.length <= 1 && s.ambEstado === 'en_ruta') invocarIA(true);
         addTel(); render(); return;
       }
 
       const sigCell  = s.ruta[1];
       const tipoSigC = g[sigCell[0]][sigCell[1]];
       const sigKC    = `${sigCell[0]},${sigCell[1]}`;
 
       let ticksNec = tipoSigC === 2 ? TICKS_RAPIDA : TICKS_LENTA;
       if (s.enCongestion) ticksNec = TICKS_CONG;
       const obsEnSig = s.obstaculos.find(o => o.activo && !o.impasable && o.celdas.some(([r, c]) => `${r},${c}` === sigKC));
       if (obsEnSig) ticksNec = s.policiaActivo ? Math.max(TICKS_RAPIDA, Math.round(TICKS_OBS_P * 0.67)) : TICKS_OBS_P;
       const slowAbA = abordoA.length > 0 ? Math.max(...abordoA.map(p => GRAVEDAD[p.gravedad].slowTicks)) : 0;
       ticksNec += slowAbA;
       if (s.cooldown > 0) ticksNec = Math.max(ticksNec, TICKS_RAPIDA + 2);
 
       s.tickCelda = (s.tickCelda || 0) + 1;
       if (s.tickCelda < ticksNec) { addTel(); render(); return; }
       s.tickCelda = 0;
 
       // 13) CONSUMO Y DESGASTE
       const cons  = tipoSigC === 2 ? CONS_RAPIDA : CONS_LENTA;
       const consF = s.enCongestion ? cons * MULT_CONG : (obsEnSig ? cons * MULT_OBS : cons);
       s.combustible  = Math.max(0, s.combustible - consF);
       s.desgaste     = Math.min(100, s.desgaste + 0.18);
       s.kmRecorridos = +(s.kmRecorridos + 0.1).toFixed(1);
 
       if (s.combustible <= 0) {
         addLog('🛑 COMBUSTIBLE AGOTADO en trayecto', true);
         s.ambEstado = 'sin_comb'; s.ruta = []; s.mision = []; s.velocidad = 0; s.velObjetivo = 0;
         invocarIA(true); addTel(); actualizarAlertasIA(); render(); return;
       }
 
       // 14) AVERÍA ALEATORIA
       const probAv = UMBRALES_FALLO.desgaste.find(u => s.desgaste >= u.nivel)?.prob ?? 0;
       if (probAv > 0 && Math.random() < probAv) {
         const dur = 20 + Math.floor(Math.random() * 30);
         addLog(`🔧 ¡Avería! — ${dur}t de reparación`, true);
         s.ambEstado = 'averiada'; s.tiempoAveria = dur; s.velocidad = 0; s.velObjetivo = 0;
         s.ruta = []; s.mision = []; addTel(); actualizarAlertasIA(); render(); return;
       }
 
       // 15) AVANZAR CELDA
       const siguiente = s.ruta[1];
       s.ruta      = s.ruta.slice(1);
       s.ambulancia = siguiente;
       if (t % 60 === 0) s.recalcCount = 0;
 
       // 16) POLICÍA
       const restaurarSemForzados = (tick) => {
         s.policiaSemForzados.forEach(sid => {
           const sem = s.semaforos.find(se => se.id === sid);
           if (sem) {
             sem._forzadoVerde = false;
             sem.verde = calcVerdeEnTick(sem, tick);
           }
         });
       };
 
       if (s.policiaActivo && s.ruta.length > 1) {
         const grd = gridRef.current;
         s.policiaCeldasRapidas.forEach(([pr, pc, orig]) => { if (grd[pr] && grd[pr][pc] !== undefined) grd[pr][pc] = orig; });
         restaurarSemForzados(t);
         s.zonasCongesion.push(...s.policiaConqDespejadas);
         s.policiaCeldasRapidas = []; s.policiaSemForzados = []; s.policiaConqDespejadas = [];
 
         const idxPol = Math.min(POLICIA_ADELANTO, s.ruta.length - 1);
         s.policiaPos = s.ruta[idxPol];
 
         const [polR, polC] = s.policiaPos;
         for (let dr = -POLICIA_RADIO; dr <= POLICIA_RADIO; dr++) {
           for (let dc = -POLICIA_RADIO; dc <= POLICIA_RADIO; dc++) {
             const nr = polR + dr, nc = polC + dc;
             if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && grd[nr][nc] === 1) {
               s.policiaCeldasRapidas.push([nr, nc, 1]);
               grd[nr][nc] = 2;
             }
           }
         }
 
         s.semaforos.forEach(sem => {
           const enRadio = Math.abs(sem.pos[0] - polR) <= POLICIA_RADIO && Math.abs(sem.pos[1] - polC) <= POLICIA_RADIO;
           if (enRadio && !sem._forzadoVerde) { sem.verde = true; sem._forzadoVerde = true; s.policiaSemForzados.push(sem.id); }
         });
 
         const congDespejadas = [];
         s.zonasCongesion = s.zonasCongesion.filter(z => {
           const enRadio = z.celdas.some(([zr, zc]) =>
             Math.abs(zr - polR) <= POLICIA_RADIO && Math.abs(zc - polC) <= POLICIA_RADIO);
           if (enRadio) { congDespejadas.push(z); return false; }
           return true;
         });
         s.policiaConqDespejadas = congDespejadas;
 
         const obsEnRuta = s.ruta.some(([rr, cc]) => {
           if (Math.abs(rr - polR) > POLICIA_RADIO || Math.abs(cc - polC) > POLICIA_RADIO) return false;
           return s.obstaculos.some(o => o.activo && o.impasable && o.celdas.some(([or, oc]) => or === rr && oc === cc));
         });
         if (obsEnRuta && s.mision.length > 0) {
           addLog('🚔 Policía detecta obstáculo adelante — recalculando ruta');
           const nuevaRuta = calcularRuta(s.ambulancia, s.mision[0].pos);
           if (nuevaRuta.length > 0) {
             s.ruta = nuevaRuta; s.velObjetivo = 0;
             s.recalcCount = (s.recalcCount || 0) + 1;
             addLog(`🔄 Ruta recalculada por aviso policial (${nuevaRuta.length} celdas)`);
           } else {
             addLog('⚠️ Policía: sin ruta alternativa disponible');
           }
         }
       } else if (s.policiaActivo && s.ruta.length <= 1) {
         const grd = gridRef.current;
         s.policiaCeldasRapidas.forEach(([pr, pc, orig]) => { if (grd[pr] && grd[pr][pc] !== undefined) grd[pr][pc] = orig; });
         restaurarSemForzados(t);
         s.zonasCongesion.push(...s.policiaConqDespejadas);
         s.policiaCeldasRapidas = []; s.policiaSemForzados = []; s.policiaConqDespejadas = [];
         s.policiaPos = null;
       }
 
       // 17) VERIFICAR WAYPOINT
       const wp = s.mision[0];
       if (!wp) { if (t % INTERVALO_RECALC === 0) invocarIA(true); addTel(); render(); return; }
 
       if (siguiente[0] === wp.pos[0] && siguiente[1] === wp.pos[1]) {
         s.velocidad = 0; s.velObjetivo = 0;
 
         if (wp.tipo === 'gasolinera') {
           addLog('⛽ Iniciando repostaje', true);
           s.ambEstado = 'repostando'; s.tiempoRepost = 35;
           s.gasolineras = s.gasolineras.map(gg => gg.id === wp.id ? { ...gg, ocupada: true } : gg);
           s.ruta = []; s.mision = []; addTel(); actualizarAlertasIA(); render(); return;
         }
 
         if (wp.tipo === 'paciente') {
           s.pacientes = s.pacientes.map(p => p.id === wp.id ? { ...p, estado: 'abordo' } : p);
           addLog(`🧑‍⚕️ Paciente ${GRAVEDAD[wp.gravedad]?.label || ''} recogido`, true);
         } else if (wp.tipo === 'hospital') {
           const abN = s.pacientes.filter(p => p.estado === 'abordo');
           s.pacientes = s.pacientes.map(p => p.estado === 'abordo' ? { ...p, estado: 'entregado' } : p);
           s.hospitales = s.hospitales.map(h => {
             if (h.id !== wp.id) return h;
             const nO  = Math.min(h.capacidadMax, h.ocupacion + abN.length);
             const sat = nO >= h.capacidadMax;
             if (sat) addLog('🏥 Hospital saturado', true);
             return { ...h, ocupacion: nO, saturado: sat, satDesde: sat ? t : h.satDesde };
           });
           s.misionesOk++;
           addLog(`🏥 ${abN.length} paciente(s) entregados`, true);
         }
 
         s.mision = s.mision.slice(1);
         if (s.mision.length > 0) {
           const nuevaRuta = calcularRuta(siguiente, s.mision[0].pos);
           if (nuevaRuta.length > 0) { s.ruta = nuevaRuta; s.velObjetivo = 0; addLog(`🔄 Ruta → ${s.mision[0].tipo}`); }
           else invocarIA(true);
         } else invocarIA(true);
         addTel(); actualizarAlertasIA(); render(); return;
       }
 
       // 18) RECÁLCULO PERIÓDICO
       if (t % INTERVALO_RECALC === 0 && wp) {
         const obsEnRutaActual = s.ruta.slice(1).find(([rr, cc]) => {
           const enVentana =
             Math.abs(rr - s.ambulancia[0]) <= RADIO_CONCIENCIA &&
             Math.abs(cc - s.ambulancia[1]) <= RADIO_CONCIENCIA;
           if (!enVentana) return false;
           return s.obstaculos.some(o => o.activo && o.celdas.some(([or, oc]) => or === rr && oc === cc));
         });
         if (obsEnRutaActual) {
           const obsInfo = s.obstaculos.find(o =>
             o.activo && o.celdas.some(([or, oc]) => or === obsEnRutaActual[0] && oc === obsEnRutaActual[1])
           );
           addLog(
             `👁️ ${TIPOS_OBS[obsInfo.tipo].icon} ${TIPOS_OBS[obsInfo.tipo].label} detectado en ruta ` +
             `(${obsEnRutaActual[0]},${obsEnRutaActual[1]})${obsInfo.impasable ? ' — recalculando' : ' — pasable, penalizando'}`,
             obsInfo.impasable
           );
         }
 
         const nuevaRuta = calcularRuta(siguiente, wp.pos);
         if (nuevaRuta.length > 0) {
           if (nuevaRuta.length < s.ruta.length || s.ruta.length === 0) {
             addLog(`🔄 Ruta optimizada: ${s.ruta.length}→${nuevaRuta.length} celdas`);
             s.ruta = nuevaRuta; s.recalcCount = (s.recalcCount || 0) + 1;
           }
         } else {
           addLog('🛑 Ruta bloqueada — re-planificando'); invocarIA(true);
         }
       }
 
       addTel(); render();
     }, TICK_MS);
 
     return () => clearInterval(intRef.current);
   }, [running]);
 
   const handleClick = useCallback((r, c) => {
     const s = sim.current;
     const g = gridRef.current;
     const pos = snapCalle(r, c, g, GRID);
     if (g[pos[0]][pos[1]] <= 0) return;
 
     if (modo === 'mover_amb') {
       if (s.combustible <= 0) { addLog('🛑 Sin combustible'); render(); return; }
       s.ambulancia = pos; s.velocidad = 0; s.velObjetivo = 0; invocarIA(true);
       addLog(`🚑 Ambulancia → (${pos[0]},${pos[1]})`); render(); return;
     }
     if (modo === 'add_hosp') {
       s.hospitales = [...s.hospitales, { id: uid(), pos, saturado: false, capacidadMax: 10, ocupacion: 0, satDesde: null }];
       invocarIA(false); addLog(`🏥 Hospital en (${pos[0]},${pos[1]})`); render(); return;
     }
     if (modo === 'add_gas') {
       s.gasolineras = [...s.gasolineras, { id: uid(), pos, ocupada: false }];
       if (s.ambEstado === 'sin_comb') invocarIA(true); else invocarIA(false);
       addLog(`⛽ Gasolinera en (${pos[0]},${pos[1]})`); render(); return;
     }
     if (modo === 'add_pac') {
       s.pacientes = [...s.pacientes, { id: uid(), pos, gravedad: gravedadSel, estado: 'esperando', llegada: s.tick }];
       invocarIA(false); addLog(`🧑‍⚕️ Paciente ${GRAVEDAD[gravedadSel].label} en (${pos[0]},${pos[1]})`); render(); return;
     }
     if (modo === 'add_obs') {
       const cfg     = TIPOS_OBS[tipoObs];
       const celdas  = celdasAfectadas(g, pos, cfg.radio, GRID);
       const durFinal= obsIndefin ? -1 : durObs;
       s.obstaculos  = [...s.obstaculos, { id: uid(), tipo: tipoObs, origen: pos, celdas, impasable: cfg.impasable, llegada: s.tick, duracion: durFinal, activo: true }];
       if (s.mision.length > 0) {
         const rutaBloqueada = s.ruta.some(([rr, cc]) => celdas.some(([cr, co]) => cr === rr && co === cc));
         if (rutaBloqueada) invocarIA(true); else invocarIA(false);
       } else invocarIA(false);
       addLog(`⚠️ ${cfg.label} en (${pos[0]},${pos[1]}) dur:${durFinal < 0 ? '∞' : durFinal + 't'}`); render(); return;
     }
     if (modo === 'add_semaforo') {
       const ya = s.semaforos.find(sem => sem.pos[0] === pos[0] && sem.pos[1] === pos[1]);
       if (!ya) {
         const total = semCicloA + semCicloB;
         const faseActual = s.tick % total;
         const verde = semFase === 'A' ? faseActual < semCicloA : faseActual >= semCicloA;
         s.semaforos = [...s.semaforos, { id: uid(), pos, verde, cicloA: semCicloA, cicloB: semCicloB, fase: semFase }];
         addLog(`🚦 Semáforo ${semFase} en (${pos[0]},${pos[1]})`);
         invocarIA(false);
       }
       render(); return;
     }
     if (modo === 'add_cong') {
       const ya = s.zonasCongesion.find(z => z.pos[0] === pos[0] && z.pos[1] === pos[1]);
       if (!ya) {
         const celdas = celdasAfectadas(g, pos, radioCong, GRID);
         s.zonasCongesion = [...s.zonasCongesion, { id: uid(), pos, celdas, radio: radioCong }];
         addLog(`🔶 Congestión en (${pos[0]},${pos[1]}) r=${radioCong}`);
         invocarIA(false);
       }
       render(); return;
     }
     if (modo === 'add_calle') {
       const celdas   = celdasLinea(g, pos, GRID);
       const nuevoTipo= tipoCalle === 'rapida' ? 2 : 1;
       celdas.forEach(([rr, cc]) => { if (g[rr] && g[rr][cc] > 0) g[rr][cc] = nuevoTipo; });
       addLog(`🛣️ ${celdas.length} celdas → ${tipoCalle === 'rapida' ? 'rápida' : 'lenta'}`);
       invocarIA(false); render(); return;
     }
     if (modo === 'eliminar') {
       const prev = {
         h: s.hospitales.length, g: s.gasolineras.length, p: s.pacientes.length,
         o: s.obstaculos.filter(o => o.activo).length, sem: s.semaforos.length, z: s.zonasCongesion.length,
       };
       s.hospitales    = s.hospitales.filter(h => Math.abs(h.pos[0] - r) > 1 || Math.abs(h.pos[1] - c) > 1);
       s.gasolineras   = s.gasolineras.filter(gg => Math.abs(gg.pos[0] - r) > 1 || Math.abs(gg.pos[1] - c) > 1);
       s.pacientes     = s.pacientes.filter(p => p.estado === 'entregado' || Math.abs(p.pos[0] - r) > 1 || Math.abs(p.pos[1] - c) > 1);
       s.obstaculos    = s.obstaculos.map(o => {
         if (o.activo && o.celdas.some(([cr, cc]) => Math.abs(cr - r) <= 1 && Math.abs(cc - c) <= 1)) return { ...o, activo: false };
         return o;
       });
       s.semaforos     = s.semaforos.filter(sem => Math.abs(sem.pos[0] - r) > 1 || Math.abs(sem.pos[1] - c) > 1);
       s.zonasCongesion= s.zonasCongesion.filter(z => Math.abs(z.pos[0] - r) > 2 || Math.abs(z.pos[1] - c) > 2);
       const post = {
         h: s.hospitales.length, g: s.gasolineras.length, p: s.pacientes.length,
         o: s.obstaculos.filter(o => o.activo).length, sem: s.semaforos.length, z: s.zonasCongesion.length,
       };
       if (prev.h > post.h) addLog('🗑️ Hospital eliminado');
       if (prev.g > post.g) addLog('🗑️ Gasolinera eliminada');
       if (prev.p > post.p) addLog('🗑️ Paciente eliminado');
       if (prev.o > post.o) addLog('🗑️ Obstáculo eliminado');
       if (prev.sem > post.sem) addLog('🗑️ Semáforo eliminado');
       if (prev.z > post.z) addLog('🗑️ Congestión eliminada');
       invocarIA(false); render();
     }
   }, [modo, gravedadSel, tipoObs, durObs, obsIndefin, semCicloA, semCicloB, semFase, radioCong, tipoCalle, addLog, invocarIA, render]);
 
   const resetSim = useCallback(() => {
     setRunning(false);
     clearInterval(intRef.current);
     gridRef.current = makeGrid();
     sim.current     = makeInitState(gridRef.current);
     ia.current      = new IAambulancia();
     render();
   }, [render]);
 
   return {
     sim, gridRef, ia,
     modo, setModo, gravedadSel, setGravedadSel,
     tipoObs, setTipoObs, durObs, setDurObs, obsIndefin, setObsIndefin,
     semCicloA, setSemCicloA, semCicloB, setSemCicloB, semFase, setSemFase,
     radioCong, setRadioCong, tipoCalle, setTipoCalle,
     hover, setHover, tabDer, setTabDer, tabLog, setTabLog,
     running, setRunning,
     policiaEnabled, setPoliciaEnabled,
     handleClick, render, invocarIA, addLog, getConciencia, resetSim,
   };
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 12: COMPONENTES UI ─────────────────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 // ── Header ──
 function Header({ s, getIcon, pacEsp, slotsUs, C_COMB, C_TEMP, C_VEL, sinComb, policiaActivo, modoCritA }) {
   const est = AMB_ESTADO[s.ambEstado] ?? AMB_ESTADO.libre;
   return (
     <div style={{ background: 'linear-gradient(90deg,#0f172a,#1e293b)', borderBottom: '1px solid #1e3a5f', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
       <span style={{ fontSize: 18 }}>{getIcon()}</span>
       <div>
         <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: 1 }}>GEMELO DIGITAL — AMBULANCIA</div>
         <div style={{ fontSize: 8, color: '#475569' }}>Fase II de los retos HPE CDS</div>
       </div>
       <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
         {[
           { l: 'SEG.',    v: s.tick },
           { l: 'ESTADO',  v: est.label, c: est.color },
           { l: 'GAS.',      v: `${s.combustible.toFixed(0)}%`, c: C_COMB },
           { l: 'TEMP.',     v: `${s.temperatura.toFixed(1)}°`, c: C_TEMP },
           { l: 'VEL.',     v: `${s.velocidad.toFixed(0)}km/h`, c: C_VEL },
           { l: 'ESPERA',  v: pacEsp.length, c: pacEsp.some(p => p.gravedad === 'critica') ? '#ef4444' : '#94a3b8' },
           { l: 'ABORDO',  v: `${slotsUs}/${s.capacidad}` },
           { l: 'MISIONES',v: s.misionesOk, c: '#22c55e' },
         ].map(({ l, v, c }) => (
           <div key={l} style={{ textAlign: 'center' }}>
             <div style={{ fontSize: 11, fontWeight: 700, color: c ?? '#38bdf8' }}>{v}</div>
             <div style={{ fontSize: 7, color: '#475569' }}>{l}</div>
           </div>
         ))}
         {s.cooldown > 0    && <span style={{ fontSize: 8, color: '#ff6b35', background: '#ff6b3518', border: '1px solid #ff6b3530', borderRadius: 4, padding: '2px 6px' }}>🌡️ COOLDOWN {s.cooldown}t</span>}
         {sinComb           && <span style={{ fontSize: 8, color: '#dc2626', background: '#dc262618', border: '1px solid #dc262630', borderRadius: 4, padding: '2px 6px' }}>🪫 SIN COMB.</span>}
         {s.enCongestion    && <span style={{ fontSize: 8, color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 4, padding: '2px 6px' }}>🔶 CONGESTIÓN</span>}
         {policiaActivo     && <span style={{ fontSize: 8, color: '#3b82f6', background: '#3b82f618', border: '1px solid #3b82f630', borderRadius: 4, padding: '2px 6px' }}>🚔 ESCOLTA</span>}
         {modoCritA         && <span style={{ fontSize: 8, color: '#ef4444', background: '#ef444418', border: '1px solid #ef444430', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>🚨 CRÍTICO A BORDO</span>}
       </div>
     </div>
   );
 }
 
 // ── LeftPanel ──
 function LeftPanel({
   s, modo, setModo, gravedadSel, setGravedadSel,
   tipoObs, setTipoObs, durObs, setDurObs, obsIndefin, setObsIndefin,
   semCicloA, setSemCicloA, semCicloB, setSemCicloB, semFase, setSemFase,
   radioCong, setRadioCong, tipoCalle, setTipoCalle,
   slotsUs, running, setRunning, invocarIA, addLog, render, resetSim,
   policiaEnabled, setPoliciaEnabled,
 }) {
   return (
     <div style={{ width: 200, background: '#0b1120', borderRight: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
       <div style={{ flex: 1, overflowY: 'auto' }}>
 
         {/* Selector de modo */}
         <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>MODO</div>
           {Object.entries(MODOS).map(([k, m]) => (
             <button key={k} onClick={() => setModo(k)} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', background: modo === k ? m.color + '20' : 'transparent', border: `1px solid ${modo === k ? m.color : '#1e3a5f'}`, borderRadius: 3, padding: '4px 6px', marginBottom: 2, color: modo === k ? m.color : '#64748b', fontSize: 9, cursor: 'pointer', textAlign: 'left' }}>
               <span style={{ fontSize: 10 }}>{m.icon}</span>{m.label}
             </button>
           ))}
         </div>
 
         {/* Gravedad */}
         {modo === 'add_pac' && (
           <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
             <div style={{ fontSize: 7, color: '#f59e0b', letterSpacing: 2, marginBottom: 4 }}>GRAVEDAD</div>
             {Object.entries(GRAVEDAD).map(([k, gv]) => (
               <button key={k} onClick={() => setGravedadSel(k)} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', background: gravedadSel === k ? gv.color + '20' : 'transparent', border: `1px solid ${gravedadSel === k ? gv.color : '#1e3a5f'}`, borderRadius: 3, padding: '4px 6px', marginBottom: 2, color: gravedadSel === k ? gv.color : '#64748b', fontSize: 9, cursor: 'pointer' }}>
                 <span>{gv.icon}</span>
                 <div>
                   <div style={{ fontWeight: 600 }}>{gv.label}</div>
                   <div style={{ fontSize: 7, opacity: 0.7 }}>{gv.slots}sl · {gv.velMax > VEL_MAX_RAPIDA ? 'prioridad' : gv.velMax === VEL_MAX_RAPIDA ? 'normal' : 'lento'}</div>
                 </div>
               </button>
             ))}
           </div>
         )}
 
         {/* Obstáculo */}
         {modo === 'add_obs' && (
           <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
             <div style={{ fontSize: 7, color: '#ef4444', letterSpacing: 2, marginBottom: 4 }}>OBSTÁCULO</div>
             {Object.entries(TIPOS_OBS).map(([k, tp]) => (
               <button key={k} onClick={() => setTipoObs(k)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', background: tipoObs === k ? tp.color + '20' : 'transparent', border: `1px solid ${tipoObs === k ? tp.color : '#1e3a5f'}`, borderRadius: 3, padding: '4px 6px', marginBottom: 2, color: tipoObs === k ? tp.color : '#64748b', fontSize: 9, cursor: 'pointer' }}>
                 <span>{tp.icon}</span>
                 <div><div>{tp.label}</div><div style={{ fontSize: 7, opacity: 0.6 }}>{tp.impasable ? 'Impasable' : 'Pasable'}</div></div>
               </button>
             ))}
             <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
               <input type="checkbox" checked={obsIndefin} onChange={e => setObsIndefin(e.target.checked)} id="ind" style={{ accentColor: '#38bdf8' }} />
               <label htmlFor="ind" style={{ fontSize: 8, color: '#94a3b8', cursor: 'pointer' }}>Duración indefinida</label>
             </div>
             {!obsIndefin && (
               <>
                 <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>Duración: <b>{durObs}t</b></div>
                 <input type="range" min={30} max={600} step={30} value={durObs} onChange={e => setDurObs(+e.target.value)} style={{ width: '100%', marginTop: 2, accentColor: '#38bdf8' }} />
               </>
             )}
           </div>
         )}
 
         {/* Semáforo */}
         {modo === 'add_semaforo' && (
           <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
             <div style={{ fontSize: 7, color: '#22c55e', letterSpacing: 2, marginBottom: 4 }}>SEMÁFORO</div>
             <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
               {['A', 'B'].map(f => (
                 <button key={f} onClick={() => setSemFase(f)} style={{ flex: 1, padding: '4px 0', borderRadius: 3, cursor: 'pointer', background: semFase === f ? '#22c55e20' : 'transparent', border: `1px solid ${semFase === f ? '#22c55e' : '#1e3a5f'}`, color: semFase === f ? '#22c55e' : '#64748b', fontSize: 10, fontWeight: 700 }}>
                   {f === 'A' ? '🟩→🟥' : '🟥→🟩'}
                 </button>
               ))}
             </div>
             <div style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>Verde: <b style={{ color: '#22c55e' }}>{semCicloA}t</b></div>
             <input type="range" min={5} max={60} step={5} value={semCicloA} onChange={e => setSemCicloA(+e.target.value)} style={{ width: '100%', accentColor: '#22c55e', marginBottom: 5 }} />
             <div style={{ fontSize: 7, color: '#475569', marginBottom: 2 }}>Rojo: <b style={{ color: '#ef4444' }}>{semCicloB}t</b></div>
             <input type="range" min={5} max={60} step={5} value={semCicloB} onChange={e => setSemCicloB(+e.target.value)} style={{ width: '100%', accentColor: '#ef4444' }} />
           </div>
         )}
 
         {/* Congestión */}
         {modo === 'add_cong' && (
           <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
             <div style={{ fontSize: 7, color: '#f59e0b', letterSpacing: 2, marginBottom: 4 }}>CONGESTIÓN</div>
             <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>Radio: <b style={{ color: '#f59e0b' }}>{radioCong}</b></div>
             <input type="range" min={1} max={7} step={1} value={radioCong} onChange={e => setRadioCong(+e.target.value)} style={{ width: '100%', accentColor: '#f59e0b' }} />
             <div style={{ fontSize: 7, color: '#334155', marginTop: 4 }}>Solo visible dentro de ventana {RADIO_CONCIENCIA}c</div>
           </div>
         )}
 
         {/* Tipo de calle */}
         {modo === 'add_calle' && (
           <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
             <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>TIPO DE CALLE</div>
             {[['rapida','⚡ Rápida','50 km/h','#38bdf8'],['lenta','🐌 Lenta','30 km/h','#94a3b8']].map(([k, l, d, c]) => (
               <button key={k} onClick={() => setTipoCalle(k)} style={{ display: 'flex', flexDirection: 'column', width: '100%', background: tipoCalle === k ? c + '20' : 'transparent', border: `1px solid ${tipoCalle === k ? c : '#1e3a5f'}`, borderRadius: 3, padding: '5px 7px', marginBottom: 3, color: tipoCalle === k ? c : '#64748b', fontSize: 9, cursor: 'pointer', textAlign: 'left' }}>
                 <span style={{ fontWeight: 600 }}>{l}</span>
                 <span style={{ fontSize: 7, opacity: 0.7 }}>{d} · marca toda la línea</span>
               </button>
             ))}
           </div>
         )}
 
         {/* Capacidad */}
         <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>CAPACIDAD (SLOTS)</div>
           <div style={{ display: 'flex', gap: 3 }}>
             {[1, 2, 3, 4].map(n => (
               <button key={n} onClick={() => { s.capacidad = n; invocarIA(false); render(); }} style={{ flex: 1, padding: '4px 0', borderRadius: 3, cursor: 'pointer', background: s.capacidad === n ? '#38bdf820' : 'transparent', border: `1px solid ${s.capacidad === n ? '#38bdf8' : '#1e3a5f'}`, color: s.capacidad === n ? '#38bdf8' : '#64748b', fontSize: 11, fontWeight: 700 }}>
                 {n}
               </button>
             ))}
           </div>
           <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
             {Array.from({ length: s.capacidad }).map((_, i) => (
               <div key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: i < slotsUs ? '#38bdf8' : '#1e293b' }} />
             ))}
           </div>
         </div>
 
         {/* Gasolineras */}
         <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>GASOLINERAS</div>
           {s.gasolineras.map(gg => (
             <div key={gg.id} style={{ display: 'flex', justifyContent: 'space-between', background: gg.ocupada ? '#f59e0b10' : '#38bdf808', border: `1px solid ${gg.ocupada ? '#f59e0b40' : '#1e3a5f'}`, borderRadius: 3, padding: '3px 6px', marginBottom: 2, fontSize: 8 }}>
               <span style={{ color: gg.ocupada ? '#f59e0b' : '#64748b' }}>⛽ ({gg.pos[0]},{gg.pos[1]})</span>
               <span style={{ color: gg.ocupada ? '#f59e0b' : '#22c55e', fontSize: 7 }}>{gg.ocupada ? 'En uso' : 'Libre'}</span>
             </div>
           ))}
         </div>
 
         {/* Hospitales */}
         <div style={{ padding: '7px 9px', borderBottom: '1px solid #1e3a5f' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>HOSPITALES</div>
           {s.hospitales.map(h => (
             <div key={h.id} style={{ background: h.saturado ? '#ef444410' : '#10b98110', border: `1px solid ${h.saturado ? '#ef4444' : '#10b981'}33`, borderRadius: 3, padding: '4px 6px', marginBottom: 3 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: h.saturado ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 8 }}>🏥 {h.saturado ? 'SAT' : 'OK'}</span>
                 <button onClick={() => {
                   s.hospitales = s.hospitales.map(hh => hh.id === h.id ? { ...hh, saturado: !hh.saturado, satDesde: !hh.saturado ? s.tick : null } : hh);
                   addLog(`🏥 Hospital ${h.saturado ? 'liberado' : 'saturado'}`);
                   invocarIA(false); render();
                 }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 7, color: h.saturado ? '#10b981' : '#ef4444' }}>
                   {h.saturado ? 'liberar' : 'saturar'}
                 </button>
               </div>
               <div style={{ height: 3, background: '#1e293b', borderRadius: 2, marginTop: 2 }}>
                 <div style={{ height: '100%', borderRadius: 2, background: h.saturado ? '#ef4444' : '#10b981', width: `${(h.ocupacion / h.capacidadMax) * 100}%` }} />
               </div>
               <div style={{ color: '#334155', fontSize: 7, marginTop: 1 }}>{h.ocupacion}/{h.capacidadMax}</div>
             </div>
           ))}
         </div>
 
         {/* Controles */}
         <div style={{ padding: '7px 9px' }}>
           <button onClick={() => setPoliciaEnabled(p => !p)} style={{ width: '100%', padding: '6px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, background: policiaEnabled ? '#3b82f620' : 'transparent', border: `1px solid ${policiaEnabled ? '#3b82f6' : '#1e3a5f'}`, color: policiaEnabled ? '#3b82f6' : '#64748b', fontSize: 9, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
             <span style={{ fontSize: 12 }}>🚔</span> {policiaEnabled ? 'Escolta ON' : 'Escolta policial'}
           </button>
           {policiaEnabled && (
             <div style={{ fontSize: 7, color: '#3b82f6', background: '#3b82f610', border: '1px solid #3b82f625', borderRadius: 3, padding: '3px 6px', marginBottom: 3, lineHeight: 1.5 }}>
               🚔 Escolta activa: calles → rápidas, semáforos → verde
             </div>
           )}
           <button onClick={() => setRunning(r => !r)} style={{ width: '100%', padding: '7px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, background: running ? '#10b98120' : '#38bdf820', border: `1px solid ${running ? '#10b981' : '#38bdf8'}`, color: running ? '#10b981' : '#38bdf8', fontSize: 11, marginBottom: 3 }}>
             {running ? '⏸ Pausar' : '▶ Iniciar'}
           </button>
           <button onClick={resetSim} style={{ width: '100%', padding: '5px', borderRadius: 4, cursor: 'pointer', background: 'transparent', border: '1px solid #1e3a5f', color: '#64748b', fontSize: 9 }}>
             🔄 Reiniciar
           </button>
         </div>
       </div>
     </div>
   );
 }
 
 // ── MapGrid ──
 function MapGrid({
   s, g, modo, gravedadSel, tipoObs, durObs, obsIndefin,
   semCicloA, semCicloB, semFase, radioCong, tipoCalle,
   hover, setHover, handleClick,
   enRutaSet, obsColorMap, congSet, semMap, getIcon, BORD, sinComb, modoCritA,
   policiaPos,
 }) {
   const [ar, ac] = s.ambulancia;
   const enVentana = (r, c) => Math.abs(r - ar) <= RADIO_CONCIENCIA && Math.abs(c - ac) <= RADIO_CONCIENCIA;
 
   return (
     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 6, minWidth: 0 }}>
 
       <div style={{ fontSize: 8, color: '#475569', marginBottom: 4, background: '#0b1120', border: '1px solid #1e3a5f', borderRadius: 3, padding: '2px 8px', flexShrink: 0 }}>
         {MODOS[modo].icon} {MODOS[modo].label}
         {modo === 'add_pac'      && ` · ${GRAVEDAD[gravedadSel].label}`}
         {modo === 'add_obs'      && ` · ${TIPOS_OBS[tipoObs].label}${obsIndefin ? ' ∞' : ` ${durObs}t`}`}
         {modo === 'add_semaforo' && ` · Fase ${semFase} · ${semCicloA}v/${semCicloB}r`}
         {modo === 'add_cong'     && ` · radio ${radioCong}`}
         {modo === 'add_calle'    && ` · ${tipoCalle === 'rapida' ? '⚡ rápida' : '🐌 lenta'}`}
         {' · click en mapa'}
       </div>
 
       <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID},${CELL}px)`, border: '1px solid #1e3a5f', borderRadius: 3, boxShadow: '0 0 18px #38bdf80a', cursor: 'crosshair', flexShrink: 0 }}>
         {g.map((row, r) => row.map((val, c) => {
           const k      = `${r},${c}`;
           const esAmb  = s.ambulancia[0] === r && s.ambulancia[1] === c;
           const esPol  = policiaPos && policiaPos[0] === r && policiaPos[1] === c && !esAmb;
           const hosp   = s.hospitales.find(h => h.pos[0] === r && h.pos[1] === c);
           const gas    = s.gasolineras.find(gg => gg.pos[0] === r && gg.pos[1] === c);
           const pac    = s.pacientes.find(p => p.pos[0] === r && p.pos[1] === c && p.estado === 'esperando');
           const esRut  = enRutaSet.has(k) && !esAmb && !hosp && !gas && !pac;
           const esWp   = s.mision[0]?.pos[0] === r && s.mision[0]?.pos[1] === c && !esAmb;
           const obsClr = obsColorMap[k];
           const esCong = congSet.has(k);
           const sem    = semMap[k];
           const obsEnC = s.obstaculos.find(o => o.activo && o.celdas.some(([cr, cc]) => cr === r && cc === c));
           const esPasable = obsEnC && !obsEnC.impasable;
           const enVent = enVentana(r, c) && val > 0;
 
           let bg = val <= 0 ? '#06090f' : val === 2 ? '#0e2845' : '#0c1d36';
           if (esCong && val > 0)  bg = '#f59e0b06';
           if (obsClr)             bg = obsEnC?.impasable ? obsClr + '45' : obsClr + '25';
           if (esRut)              bg = sinComb ? '#dc262610' : modoCritA ? '#ef444410' : '#22c55e10';
           if (esWp && !esAmb)     bg = '#a78bfa15';
           if (hover?.[0] === r && hover?.[1] === c && val > 0) bg = '#38bdf810';
 
           return (
             <div key={k}
               onClick={() => handleClick(r, c)}
               onMouseEnter={() => setHover([r, c])}
               onMouseLeave={() => setHover(null)}
               style={{ width: CELL, height: CELL, background: bg, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', border: val > 0 ? '1px solid #0d172525' : 'none', position: 'relative', outline: enVent && val > 0 && !esAmb ? '1px solid #38bdf806' : 'none' }}>
 
               {esAmb && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BORD + '28', border: `2px solid ${BORD}`, borderRadius: 2, zIndex: 10 }}>
                   <span style={{ fontSize: 10 }}>{getIcon()}</span>
                 </div>
               )}
               {esPol && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f628', border: '2px solid #3b82f6', borderRadius: 2, zIndex: 11 }}>
                   <span style={{ fontSize: 10 }}>🚔</span>
                 </div>
               )}
               {!esAmb && hosp && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hosp.saturado ? '#ef444330' : '#10b98128', border: `2px solid ${hosp.saturado ? '#ef4444' : '#10b981'}`, borderRadius: 2, zIndex: 8 }}>
                   <span style={{ fontSize: 9 }}>{hosp.saturado ? '❌' : '🏥'}</span>
                 </div>
               )}
               {!esAmb && !hosp && gas && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: gas.ocupada ? '#f59e0b22' : '#f59e0b10', border: `1px solid ${gas.ocupada ? '#f59e0b' : '#f59e0b40'}`, borderRadius: 2, zIndex: 8 }}>
                   <span style={{ fontSize: 9 }}>⛽</span>
                 </div>
               )}
               {!esAmb && !hosp && !gas && pac && (
                 <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAVEDAD[pac.gravedad].color + '25', border: `1px solid ${GRAVEDAD[pac.gravedad].color}`, borderRadius: 2, zIndex: 7 }}>
                   <span style={{ fontSize: 9 }}>{GRAVEDAD[pac.gravedad].icon}</span>
                 </div>
               )}
               {!esAmb && !hosp && !gas && !pac && sem && (
                 <div style={{ position: 'absolute', inset: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sem.verde ? '#22c55e15' : '#ef444415', border: `2px solid ${sem.verde ? '#22c55e' : '#ef4444'}`, borderRadius: 3, zIndex: 9 }}>
                   <span style={{ fontSize: 8 }}>{sem.verde ? '🟩' : '🟥'}</span>
                 </div>
               )}
               {!esAmb && !hosp && !gas && !pac && !sem && obsClr && (
                 <span style={{ fontSize: 8, opacity: esPasable ? 0.5 : 0.9 }}>{TIPOS_OBS[obsEnC?.tipo]?.icon}</span>
               )}
               {!esAmb && !hosp && !gas && !pac && !sem && !obsClr && esCong && val > 0 && (
                 <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#f59e0b40' }} />
               )}
               {esRut && !obsClr && (
                 <div style={{ width: 3, height: 3, borderRadius: '50%', background: sinComb ? '#dc262640' : modoCritA ? '#ef444440' : '#22c55e40' }} />
               )}
               {esWp && !esAmb && !hosp && !gas && !pac && !sem && !obsClr && (
                 <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa50' }} />
               )}
               {val === 2 && !esAmb && !hosp && !gas && !pac && !sem && !obsClr && !esRut && !esCong && (
                 <div style={{ width: 2, height: 2, borderRadius: '50%', background: '#38bdf818' }} />
               )}
             </div>
           );
         }))}
       </div>
 
       {hover && (
         <div style={{ marginTop: 3, fontSize: 8, color: '#475569', background: '#0b1120', border: '1px solid #1e3a5f', borderRadius: 3, padding: '2px 8px', flexShrink: 0 }}>
           ({hover[0]},{hover[1]}) · {g[hover[0]][hover[1]] === 2 ? '⚡ rápida' : g[hover[0]][hover[1]] === 1 ? '🐌 lenta' : 'bloqueado'}
           {congSet.has(`${hover[0]},${hover[1]}`) ? ' · 🔶 congestión' : ''}
           {semMap[`${hover[0]},${hover[1]}`] ? ` · 🚦 ${semMap[`${hover[0]},${hover[1]}`].verde ? 'VERDE' : 'ROJO'}` : ''}
           {enVentana(hover[0], hover[1]) ? ' · 👁️' : ''}
         </div>
       )}
     </div>
   );
 }
 
 // ── RightPanel ──
 function RightPanel({
   s, tabDer, setTabDer, tabLog, setTabLog,
   C_COMB, C_TEMP, C_VEL, C_DESG, C_RIESG,
   pacEsp, pacAb, pacEnt, slotsUs,
   getConciencia, sinComb, modoCritA,
 }) {
   return (
     <div style={{ width: 265, background: '#0b1120', borderLeft: '1px solid #1e3a5f', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
       <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
         {[['ia','🧠 IA'],['mision','📋 Misión'],['pacs','🧑‍⚕️ Pacs'],['log','📜 Log']].map(([t, l]) => (
           <button key={t} onClick={() => setTabDer(t)} style={{ flex: 1, padding: '6px 0', fontSize: 8, cursor: 'pointer', background: tabDer === t ? '#1e3a5f20' : 'transparent', border: 'none', borderBottom: `2px solid ${tabDer === t ? '#38bdf8' : 'transparent'}`, color: tabDer === t ? '#38bdf8' : '#475569' }}>
             {l}
           </button>
         ))}
       </div>
 
       {/* IA */}
       {tabDer === 'ia' && (
         <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 5 }}>ESTADO VEHÍCULO</div>
           <div style={{ background: '#0d1a2d', border: '1px solid #1e3a5f', borderRadius: 4, padding: '6px 8px', marginBottom: 8 }}>
             {[
               { l: '📍 Posición',   v: `(${s.ambulancia[0]},${s.ambulancia[1]})`, c: '#94a3b8' },
               { l: '🏎️ Velocidad', v: `${s.velocidad.toFixed(0)} km/h`, c: C_VEL,  bar: s.velocidad, max: 60 },
               { l: '⛽ Combustible',v: `${s.combustible.toFixed(0)}%`, c: C_COMB, bar: s.combustible, max: 100 },
               { l: '🌡️ Motor',     v: `${s.temperatura.toFixed(1)}°C`, c: C_TEMP, bar: Math.max(0, s.temperatura - 70), max: 50 },
               { l: '🔩 Desgaste',  v: `${s.desgaste.toFixed(0)}%`, c: C_DESG, bar: s.desgaste, max: 100 },
               { l: '🧠 Riesgo IA', v: `${(s.riesgoIA * 100).toFixed(0)}%`, c: C_RIESG, bar: s.riesgoIA * 100, max: 100 },
             ].map(({ l, v, c, bar, max }) => (
               <div key={l} style={{ marginBottom: 5 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 1 }}>
                   <span style={{ color: '#475569' }}>{l}</span>
                   <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                 </div>
                 {bar !== undefined && (
                   <div style={{ height: 3, background: '#1e293b', borderRadius: 2 }}>
                     <div style={{ height: '100%', borderRadius: 2, background: c, width: `${Math.min(100, Math.max(0, (bar / max) * 100))}%`, transition: 'width 0.4s' }} />
                   </div>
                 )}
               </div>
             ))}
             {s.cooldown > 0         && <div style={{ fontSize: 7, color: '#ff6b35', marginTop: 2 }}>🌡️ Cooldown: {s.cooldown}t · cap {VEL_CAP_TEMP}km/h</div>}
             {s.ambEstado==='averiada'  && <div style={{ fontSize: 7, color: '#ef4444', marginTop: 2 }}>🔧 Avería — {s.tiempoAveria}t restantes</div>}
             {s.ambEstado==='repostando'&& <div style={{ fontSize: 7, color: '#f59e0b', marginTop: 2 }}>⛽ Repostando — {s.tiempoRepost}t restantes</div>}
             {s.ambEstado==='parado_sem'&& <div style={{ fontSize: 7, color: '#f59e0b', marginTop: 2 }}>🚦 Parado en semáforo rojo</div>}
           </div>
 
           {s.alertasIA && s.alertasIA.length > 0 && (
             <div style={{ marginBottom: 8 }}>
               <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>🚨 ALERTAS ACTIVAS ({s.alertasIA.length})</div>
               {s.alertasIA.map(alerta => (
                 <div key={alerta.id} style={{ padding: '5px 8px', marginBottom: 4, borderRadius: 4, background: alerta.color + '12', border: `1px solid ${alerta.color}40`, borderLeft: `3px solid ${alerta.color}` }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                     <span style={{ fontSize: 8, fontWeight: 700, color: alerta.color }}>{alerta.icon} {alerta.titulo}</span>
                     <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: alerta.color + '25', color: alerta.color, textTransform: 'uppercase', fontWeight: 700 }}>{alerta.nivel}</span>
                   </div>
                   <div style={{ fontSize: 7, color: '#64748b', lineHeight: 1.4 }}>{alerta.detalle}</div>
                 </div>
               ))}
             </div>
           )}
 
           {s.iaFallo && (
             <div style={{ marginBottom: 8 }}>
               <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>🔮 PREDICCIÓN DE FALLOS</div>
               <div style={{ background: '#0d1a2d', border: `1px solid ${s.iaFallo.prob > 15 ? '#f59e0b40' : '#1e3a5f'}`, borderRadius: 4, padding: '5px 8px' }}>
                 <div style={{ fontSize: 8, color: s.iaFallo.prob > 30 ? '#ef4444' : s.iaFallo.prob > 10 ? '#f59e0b' : '#22c55e' }}>{s.iaFallo.label}</div>
                 {s.iaFallo.prob > 0 && (
                   <>
                     <div style={{ fontSize: 7, color: '#475569', marginTop: 2 }}>P(fallo/tick): {s.iaFallo.prob.toFixed(1)}% · horizonte: ~{s.iaFallo.horizonte}t</div>
                     <div style={{ height: 3, background: '#1e293b', borderRadius: 2, marginTop: 3 }}>
                       <div style={{ height: '100%', borderRadius: 2, background: s.iaFallo.prob > 30 ? '#ef4444' : s.iaFallo.prob > 10 ? '#f59e0b' : '#22c55e', width: `${Math.min(100, s.iaFallo.prob * 3)}%`, transition: 'width 0.4s' }} />
                     </div>
                   </>
                 )}
               </div>
             </div>
           )}
 
           {s.iaRec && s.iaRec !== '✅ Sistemas normales.' && (
             <div style={{ padding: '5px 7px', marginBottom: 8, borderRadius: 4, background: C_RIESG + '12', border: `1px solid ${C_RIESG}35`, fontSize: 8, color: C_RIESG, lineHeight: 1.5 }}>{s.iaRec}</div>
           )}
 
           <div style={{ marginBottom: 8 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, marginBottom: 2 }}>
               <span style={{ color: '#475569' }}>Puntuación riesgo global</span>
               <span style={{ color: C_RIESG, fontWeight: 700 }}>{(s.riesgoIA * 100).toFixed(0)}%</span>
             </div>
             <div style={{ height: 5, background: '#1e293b', borderRadius: 3, position: 'relative' }}>
               <div style={{ height: '100%', borderRadius: 3, background: C_RIESG, width: `${s.riesgoIA * 100}%`, transition: 'width 0.4s' }} />
               <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${UMBRAL_MEDIO * 100}%`, width: 1, background: '#f59e0b55' }} />
               <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${UMBRAL_ALTO * 100}%`, width: 1, background: '#ef444455' }} />
             </div>
           </div>
 
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 4 }}>PLANIFICADOR</div>
           {s.razonIA.length === 0
             ? <div style={{ fontSize: 8, color: '#334155' }}>Sin decisión activa.</div>
             : s.razonIA.map((r, i) => (
               <div key={i} style={{ fontSize: 8, padding: '3px 6px', marginBottom: 2, borderRadius: 3, background: '#1e293b', border: '1px solid #1e3a5f', color: '#94a3b8', lineHeight: 1.5 }}>{r}</div>
             ))
           }
 
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, margin: '8px 0 4px' }}>👁️ VENTANA LOCAL (radio de {RADIO_CONCIENCIA})</div>
           {(() => {
             const { obsL, semRojL, congL } = getConciencia();
             return (
               <div style={{ background: '#0d1a2d', border: '1px solid #1e3a5f', borderRadius: 3, padding: '5px 7px', fontSize: 7 }}>
                 <div style={{ color: obsL.filter(o => o.impasable).length > 0 ? '#ef4444' : '#334155' }}>Obstáculos impasables: {obsL.filter(o => o.impasable).length}</div>
                 <div style={{ color: obsL.filter(o => !o.impasable).length > 0 ? '#f59e0b' : '#334155' }}>Obstáculos pasables: {obsL.filter(o => !o.impasable).length}</div>
                 <div style={{ color: semRojL.length > 0 ? '#ef4444' : '#334155' }}>Semáforos en rojo: {semRojL.length}</div>
                 <div style={{ color: congL.length > 0 ? '#f59e0b' : '#334155' }}>Zonas congestión: {congL.length}</div>
                 <div style={{ color: '#1e3a5f', marginTop: 3 }}>A* global: solo tipos de calle · sin obstáculos lejanos</div>
               </div>
             );
           })()}
 
           {s.eventosEco.length > 0 && (
             <>
               <div style={{ fontSize: 7, color: '#a78bfa', letterSpacing: 2, margin: '8px 0 4px' }}>📡 BUS EVENTOS</div>
               {s.eventosEco.slice(0, 6).map((e, i) => (
                 <div key={i} style={{ fontSize: 7, padding: '3px 6px', marginBottom: 2, borderRadius: 3, background: '#a78bfa10', border: '1px solid #a78bfa20', color: '#a78bfa' }}>
                   <span style={{ color: '#6d28d9' }}>t={e.t}</span> → <b>{e.tipo}</b>
                 </div>
               ))}
             </>
           )}
         </div>
       )}
 
       {/* Misión */}
       {tabDer === 'mision' && (
         <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 6 }}>PLAN DE MISIÓN</div>
           {s.mision.length === 0
             ? <div style={{ fontSize: 9, color: '#334155', textAlign: 'center', padding: 12 }}>Sin misión activa.</div>
             : s.mision.map((wp, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', marginBottom: 2, borderRadius: 3, fontSize: 8, background: i === 0 ? '#38bdf810' : 'transparent', border: `1px solid ${i === 0 ? '#38bdf830' : '#1e3a5f'}`, color: i === 0 ? '#94a3b8' : '#475569' }}>
                 <span style={{ fontSize: 7 }}>{i === 0 ? '▶' : `${i + 1}.`}</span>
                 <span>{wp.tipo === 'paciente' ? '🧑‍⚕️' : wp.tipo === 'hospital' ? '🏥' : '⛽'}</span>
                 <span style={{ flex: 1 }}>{wp.tipo === 'paciente' && wp.gravedad ? `${GRAVEDAD[wp.gravedad].icon} ${GRAVEDAD[wp.gravedad].label}` : wp.tipo === 'hospital' ? 'Entregar' : 'Repostar'}</span>
                 <span style={{ fontSize: 7, opacity: 0.4 }}>({wp.pos[0]},{wp.pos[1]})</span>
               </div>
             ))
           }
           {pacAb.length > 0 && (
             <>
               <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, margin: '8px 0 4px' }}>A BORDO</div>
               {pacAb.map(p => (
                 <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', marginBottom: 2, borderRadius: 3, fontSize: 8, background: GRAVEDAD[p.gravedad].color + '12', border: `1px solid ${GRAVEDAD[p.gravedad].color}30`, color: GRAVEDAD[p.gravedad].color }}>
                   {GRAVEDAD[p.gravedad].icon} {GRAVEDAD[p.gravedad].label}
                   <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 7 }}>{GRAVEDAD[p.gravedad].slots}sl</span>
                 </div>
               ))}
             </>
           )}
           <div style={{ fontSize: 7, color: '#334155', marginTop: 8 }}>Ruta activa: {s.ruta.length} celdas</div>
         </div>
       )}
 
       {/* Pacientes */}
       {tabDer === 'pacs' && (
         <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
           <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, marginBottom: 5 }}>ESPERANDO ({pacEsp.length})</div>
           {pacEsp.length === 0
             ? <div style={{ fontSize: 8, color: '#334155', marginBottom: 6 }}>Ninguno en espera</div>
             : pacEsp.map(p => {
               const esp = s.tick - (p.llegada ?? 0);
               const pct = Math.min(100, (esp / GRAVEDAD[p.gravedad].timeoutSeg) * 100);
               return (
                 <div key={p.id} style={{ padding: '4px 6px', marginBottom: 3, borderRadius: 3, background: GRAVEDAD[p.gravedad].color + '10', border: `1px solid ${GRAVEDAD[p.gravedad].color}28` }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 600, color: GRAVEDAD[p.gravedad].color }}>
                     <span>{GRAVEDAD[p.gravedad].icon} {GRAVEDAD[p.gravedad].label}</span>
                     <span style={{ color: '#64748b', fontWeight: 400, fontSize: 7 }}>⏱{esp}t · 🎯{puntuacion(p, s.tick)}</span>
                   </div>
                   <div style={{ height: 2, background: '#1e293b', borderRadius: 1, marginTop: 3 }}>
                     <div style={{ height: '100%', borderRadius: 1, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : GRAVEDAD[p.gravedad].color, width: `${pct}%`, transition: 'width 0.4s' }} />
                   </div>
                   <div style={{ fontSize: 6, color: '#334155', marginTop: 1 }}>
                     {p.gravedad === 'critica' ? 'Gravedad máxima' : `Escala en ${Math.max(0, GRAVEDAD[p.gravedad].timeoutSeg - esp)}t`}
                   </div>
                 </div>
               );
             })
           }
           {pacAb.length > 0 && (
             <>
               <div style={{ fontSize: 7, color: '#38bdf8', letterSpacing: 2, margin: '6px 0 4px' }}>A BORDO ({pacAb.length})</div>
               {pacAb.map(p => (
                 <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', marginBottom: 2, borderRadius: 3, fontSize: 8, background: GRAVEDAD[p.gravedad].color + '10', border: `1px solid ${GRAVEDAD[p.gravedad].color}28`, color: GRAVEDAD[p.gravedad].color }}>
                   {GRAVEDAD[p.gravedad].icon} {GRAVEDAD[p.gravedad].label}
                   <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 7 }}>{GRAVEDAD[p.gravedad].slots}sl</span>
                 </div>
               ))}
             </>
           )}
           {pacEnt.length > 0 && <div style={{ marginTop: 6, fontSize: 8, color: '#334155' }}>✅ {pacEnt.length} entregados</div>}
         </div>
       )}
 
       {/* Log */}
       {tabDer === 'log' && (
         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
             {[['eventos','📋 Eventos'],['telemetria','📊 Telemetría']].map(([t, l]) => (
               <button key={t} onClick={() => setTabLog(t)} style={{ flex: 1, padding: '5px 0', fontSize: 8, cursor: 'pointer', background: tabLog === t ? '#1e3a5f20' : 'transparent', border: 'none', borderBottom: `2px solid ${tabLog === t ? '#38bdf8' : 'transparent'}`, color: tabLog === t ? '#38bdf8' : '#475569' }}>{l}</button>
             ))}
           </div>
 
           {tabLog === 'eventos' && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                 <div style={{ fontSize: 7, color: '#334155' }}>Eventos del sistema ({s.logEv.length})</div>
                 <button onClick={() => exportarJSON(s.logEv, `eventos_t${s.tick}.json`)} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, cursor: 'pointer', background: '#38bdf815', border: '1px solid #38bdf830', color: '#38bdf8' }}>⬇️ JSON</button>
               </div>
               {s.logEv.length === 0
                 ? <span style={{ fontSize: 8, color: '#1e3a5f' }}>Sin eventos…</span>
                 : s.logEv.map((e, i) => (
                   <div key={i} style={{ fontSize: 7, padding: '2px 4px', borderRadius: 2, background: i === 0 ? '#1e293b' : e.imp ? '#1e293b55' : 'transparent', color: i === 0 ? '#94a3b8' : e.imp ? '#64748b' : '#334155', borderLeft: `2px solid ${i === 0 ? '#38bdf8' : e.imp ? '#f59e0b55' : 'transparent'}` }}>
                     <span style={{ color: '#1e3a5f', marginRight: 3 }}>t={e.t}</span>{e.msg}
                   </div>
                 ))
               }
             </div>
           )}
 
           {tabLog === 'telemetria' && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                 <div style={{ fontSize: 7, color: '#334155' }}>Telemetría ({s.logTel.length} registros)</div>
                 <button onClick={() => exportarJSON(s.logTel, `telemetria_t${s.tick}.json`)} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, cursor: 'pointer', background: '#38bdf815', border: '1px solid #38bdf830', color: '#38bdf8' }}>⬇️ JSON</button>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '24px 42px 28px 24px 26px 24px 28px 28px', gap: 1, fontSize: 6, color: '#334155', borderBottom: '1px solid #1e3a5f', paddingBottom: 2, marginBottom: 2, fontWeight: 700 }}>
                 <span>T</span><span>ESTADO</span><span>POS</span><span>VEL</span><span>COMB</span><span>TEMP</span><span>DESG</span><span>RIESG</span>
               </div>
               {s.logTel.slice(0, 100).map((rec, i) => (
                 <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 42px 28px 24px 26px 24px 28px 28px', gap: 1, fontSize: 6, padding: '1px 0', borderBottom: '1px solid #0d1a2d', color: i === 0 ? '#94a3b8' : '#334155' }}>
                   <span style={{ color: '#1e3a5f' }}>{rec.t}</span>
                   <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{rec.estado}</span>
                   <span style={{ color: '#334155', fontSize: 5 }}>({rec.pos[0]},{rec.pos[1]})</span>
                   <span style={{ color: rec.vel > 45 ? '#ef4444' : rec.vel > 25 ? '#38bdf8' : '#64748b' }}>{rec.vel}</span>
                   <span style={{ color: rec.comb < 15 ? '#ef4444' : rec.comb < 35 ? '#f59e0b' : '#22c55e' }}>{rec.comb.toFixed(0)}%</span>
                   <span style={{ color: rec.temp >= TEMP_MAX ? '#ef4444' : rec.temp > 95 ? '#f59e0b' : '#22c55e' }}>{rec.temp.toFixed(0)}°</span>
                   <span style={{ color: rec.desg > 80 ? '#ef4444' : rec.desg > 55 ? '#f59e0b' : '#38bdf8' }}>{rec.desg?.toFixed(0)}%</span>
                   <span style={{ color: rec.riesg >= UMBRAL_ALTO ? '#ef4444' : rec.riesg >= UMBRAL_MEDIO ? '#f59e0b' : '#334155' }}>{(rec.riesg * 100).toFixed(0)}%</span>
                 </div>
               ))}
             </div>
           )}
         </div>
       )}
     </div>
   );
 }
 
 // ── Legend ──
 function Legend() {
   return (
     <div style={{ borderTop: '1px solid #1e3a5f', background: '#060a12', padding: '3px 10px', display: 'flex', gap: 8, fontSize: 7, color: '#334155', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
       <span style={{ color: '#38bdf8' }}>LEYENDA:</span>
       {[['🚑','Amb.'],['🪫','Sin comb.'],['🔧','Avería'],['⛽','Repos.'],['🚦','En sem. rojo'],
        ['🌡️','Sobrecal.'],['🚨','Crít. abordo'], ['🚔','Escolta'],['🏥','Hosp.'],['❌','Hosp. sat.'],
        ['🟢','Leve'],['🟠','Grave'],['🔴','Crítico'],['💥','Accid.'],['🚧','Obra'], ['🌊','Inund.'],
        ['🔥','Incendio'],['📢','Manif.'],['🟩','Sem. verde'],['🟥','Sem. rojo'],['🔶','Congest.'],
        ].map(([ic, l], i) => <span key={i}>{ic} {l}</span>)}
       <span style={{ marginLeft: 'auto', color: '#1e3a5f' }}>Tenerbits (tenerbits@gmail.com).</span>
     </div>
   );
 }
 
 // ═══════════════════════════════════════════════════════════════
 // ── SECCIÓN 13: APP (COMPONENTE PRINCIPAL) ─────────────────────
 // ═══════════════════════════════════════════════════════════════
 
 function App() {
   const {
     sim, gridRef,
     modo, setModo, gravedadSel, setGravedadSel,
     tipoObs, setTipoObs, durObs, setDurObs, obsIndefin, setObsIndefin,
     semCicloA, setSemCicloA, semCicloB, setSemCicloB, semFase, setSemFase,
     radioCong, setRadioCong, tipoCalle, setTipoCalle,
     hover, setHover, tabDer, setTabDer, tabLog, setTabLog,
     running, setRunning,
     policiaEnabled, setPoliciaEnabled,
     handleClick, render, invocarIA, addLog, getConciencia, resetSim,
   } = useSimulation();
 
   const s = sim.current;
   const g = gridRef.current;
 
   const enRutaSet  = new Set(s.ruta.map(([r, c]) => `${r},${c}`));
 
   const obsColorMap = {};
   s.obstaculos.filter(o => o.activo).forEach(o =>
     o.celdas.forEach(([r, c]) => { obsColorMap[`${r},${c}`] = TIPOS_OBS[o.tipo].color; })
   );
 
   const congSet = new Set(
     s.zonasCongesion.flatMap(z => z.celdas.map(([r, c]) => `${r},${c}`))
   );
 
   const semMap = {};
   s.semaforos.forEach(sem => { semMap[`${sem.pos[0]},${sem.pos[1]}`] = sem; });
 
   const pacEsp  = s.pacientes.filter(p => p.estado === 'esperando')
     .sort((a, b) => puntuacion(b, s.tick) - puntuacion(a, s.tick));
   const pacAb   = s.pacientes.filter(p => p.estado === 'abordo');
   const pacEnt  = s.pacientes.filter(p => p.estado === 'entregado');
   const slotsUs = pacAb.reduce((a, p) => a + GRAVEDAD[p.gravedad].slots, 0);
 
   const sinComb   = s.ambEstado === 'sin_comb';
   const modoCritA = pacAb.some(p => p.gravedad === 'critica');
 
   const C_COMB  = s.combustible < 15  ? '#ef4444' : s.combustible < 35  ? '#f59e0b' : '#22c55e';
   const C_TEMP  = s.temperatura >= TEMP_MAX ? '#ef4444' : s.temperatura > 95 ? '#f59e0b' : '#22c55e';
   const C_VEL   = s.velocidad > 45    ? '#f97316' : s.velocidad > 25    ? '#38bdf8' : '#64748b';
   const C_DESG  = s.desgaste > 80     ? '#ef4444' : s.desgaste > 55     ? '#f59e0b' : '#38bdf8';
   const C_RIESG = s.riesgoIA >= UMBRAL_ALTO ? '#ef4444' : s.riesgoIA >= UMBRAL_MEDIO ? '#f59e0b' : '#22c55e';
 
   const getIcon = () => {
     if (sinComb)                   return '🪫';
     if (s.ambEstado==='averiada')  return '🔧';
     if (s.ambEstado==='repostando')return '⛽';
     if (s.ambEstado==='parado_sem')return '🚦';
     if (s.temperatura >= TEMP_MAX) return '🌡️';
     if (modoCritA)                 return '🚨';
     return '🚑';
   };
 
   const BORD = sinComb              ? '#dc2626'
     : s.ambEstado==='averiada'      ? '#ef4444'
     : s.ambEstado==='repostando'    ? '#f59e0b'
     : s.ambEstado==='parado_sem'    ? '#f59e0b'
     : s.temperatura >= TEMP_MAX     ? '#ff6b35'
     : modoCritA                     ? '#ef4444'
     : '#38bdf8';
 
   return (
     <div style={{ width: '100vw', height: '100vh', background: '#070b14', fontFamily: "'JetBrains Mono',monospace", color: '#e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
 
       <Header
         s={s} getIcon={getIcon} pacEsp={pacEsp} slotsUs={slotsUs}
         C_COMB={C_COMB} C_TEMP={C_TEMP} C_VEL={C_VEL}
         sinComb={sinComb} modoCritA={modoCritA}
         policiaActivo={s.policiaActivo}
       />
 
       <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
         <LeftPanel
           s={s} modo={modo} setModo={setModo}
           gravedadSel={gravedadSel} setGravedadSel={setGravedadSel}
           tipoObs={tipoObs} setTipoObs={setTipoObs}
           durObs={durObs} setDurObs={setDurObs}
           obsIndefin={obsIndefin} setObsIndefin={setObsIndefin}
           semCicloA={semCicloA} setSemCicloA={setSemCicloA}
           semCicloB={semCicloB} setSemCicloB={setSemCicloB}
           semFase={semFase} setSemFase={setSemFase}
           radioCong={radioCong} setRadioCong={setRadioCong}
           tipoCalle={tipoCalle} setTipoCalle={setTipoCalle}
           slotsUs={slotsUs}
           running={running} setRunning={setRunning}
           invocarIA={invocarIA} addLog={addLog}
           render={render} resetSim={resetSim}
           policiaEnabled={policiaEnabled} setPoliciaEnabled={setPoliciaEnabled}
         />
 
         <MapGrid
           s={s} g={g}
           modo={modo} gravedadSel={gravedadSel}
           tipoObs={tipoObs} durObs={durObs} obsIndefin={obsIndefin}
           semCicloA={semCicloA} semCicloB={semCicloB} semFase={semFase}
           radioCong={radioCong} tipoCalle={tipoCalle}
           hover={hover} setHover={setHover}
           handleClick={handleClick}
           enRutaSet={enRutaSet} obsColorMap={obsColorMap}
           congSet={congSet} semMap={semMap}
           getIcon={getIcon} BORD={BORD}
           sinComb={sinComb} modoCritA={modoCritA}
           policiaPos={s.policiaPos}
         />
 
         <RightPanel
           s={s}
           tabDer={tabDer} setTabDer={setTabDer}
           tabLog={tabLog} setTabLog={setTabLog}
           C_COMB={C_COMB} C_TEMP={C_TEMP} C_VEL={C_VEL}
           C_DESG={C_DESG} C_RIESG={C_RIESG}
           pacEsp={pacEsp} pacAb={pacAb} pacEnt={pacEnt} slotsUs={slotsUs}
           getConciencia={getConciencia}
           sinComb={sinComb} modoCritA={modoCritA}
         />
       </div>
 
       <Legend />
     </div>
   );
 }

 const root = ReactDOM.createRoot(document.getElementById('root'));
 root.render(<App />);
