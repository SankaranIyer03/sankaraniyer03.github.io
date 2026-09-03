/** Small deterministic numeric helpers shared by the interactive charts. */

/** Seeded PRNG so every chart is reproducible across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller normal draw from a uniform generator. */
export function gaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0

export function std(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

export const rmse = (actual: number[], pred: number[]): number => {
  const n = Math.min(actual.length, pred.length)
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += (actual[i] - pred[i]) ** 2
  return Math.sqrt(s / n)
}

export const mae = (actual: number[], pred: number[]): number => {
  const n = Math.min(actual.length, pred.length)
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += Math.abs(actual[i] - pred[i])
  return s / n
}

/** Signed mean error, positive means the model over-predicts. */
export const bias = (actual: number[], pred: number[]): number => {
  const n = Math.min(actual.length, pred.length)
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += pred[i] - actual[i]
  return s / n
}

export function r2(actual: number[], pred: number[]): number {
  const n = Math.min(actual.length, pred.length)
  if (!n) return 0
  const m = mean(actual.slice(0, n))
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    ssRes += (actual[i] - pred[i]) ** 2
    ssTot += (actual[i] - m) ** 2
  }
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot
}

/** Solves A·x = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue
    ;[M[col], M[pivot]] = [M[pivot], M[col]]

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r][col] / M[col][col]
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c]
    }
  }

  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]))
}

/**
 * Least-squares polynomial fit via normal equations. Deliberately unregularised:
 * the roll-to-roll chart relies on a high-order fit extrapolating badly, which
 * is the honest behaviour of an unconstrained data-driven model.
 */
export function polyfit(xs: number[], ys: number[], degree: number): number[] {
  const terms = degree + 1
  const A: number[][] = Array.from({ length: terms }, () => new Array(terms).fill(0))
  const b = new Array(terms).fill(0)

  for (let i = 0; i < xs.length; i++) {
    const powers: number[] = [1]
    for (let p = 1; p < 2 * terms; p++) powers.push(powers[p - 1] * xs[i])
    for (let r = 0; r < terms; r++) {
      for (let c = 0; c < terms; c++) A[r][c] += powers[r + c]
      b[r] += powers[r] * ys[i]
    }
  }

  return solve(A, b)
}

export const polyval = (coeffs: number[], x: number): number =>
  coeffs.reduce((acc, c, i) => acc + c * Math.pow(x, i), 0)

/** Ridge-regularised linear fit on arbitrary feature rows. */
export function ridge(X: number[][], y: number[], lambda = 1e-3): number[] {
  const p = X[0].length
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0))
  const b = new Array(p).fill(0)

  for (let i = 0; i < X.length; i++) {
    for (let r = 0; r < p; r++) {
      for (let c = 0; c < p; c++) A[r][c] += X[i][r] * X[i][c]
      b[r] += X[i][r] * y[i]
    }
  }
  for (let r = 0; r < p; r++) A[r][r] += lambda

  return solve(A, b)
}

/** Maps a domain to a pixel range for SVG plotting. */
export function scaleLinear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0)
}

/** Chooses ~n round tick values covering [min, max]. */
export function ticks(min: number, max: number, count = 5): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + step * 1e-6; v += step) out.push(+v.toFixed(10))
  return out
}
