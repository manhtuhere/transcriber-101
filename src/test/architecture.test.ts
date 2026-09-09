import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Atomic-design layering. A layer may import from itself and from the layers
 * listed against it — nothing else.
 *
 * The ordering is the point: atoms know nothing about molecules, and no
 * component of any size knows how data is fetched. Pages are the only place
 * where UI meets `lib`, which is what keeps every component renderable in a
 * test without mocking the network.
 */
const ALLOWED: Record<string, string[]> = {
  // constants is the true leaf. types sits just above it so a union can be
  // derived from the array that defines it — `typeof BOOK_STATUSES[number]` —
  // which keeps the two from drifting. That import is type-only and erased,
  // so the runtime graph stays acyclic.
  constants: [],
  types: ['constants'],
  utils: ['types', 'constants'],
  lib: ['types', 'constants', 'utils'],
  hooks: ['types', 'constants', 'utils', 'lib'],
  'components/atoms': ['types', 'constants', 'utils'],
  'components/molecules': ['types', 'constants', 'utils', 'components/atoms'],
  'components/organisms': [
    'types',
    'constants',
    'utils',
    'components/atoms',
    'components/molecules',
  ],
  'components/templates': [
    'types',
    'constants',
    'utils',
    'components/atoms',
    'components/molecules',
    'components/organisms',
  ],
  pages: [
    'types',
    'constants',
    'utils',
    'hooks',
    'components/atoms',
    'components/molecules',
    'components/organisms',
    'components/templates',
  ],
  app: [
    'types',
    'constants',
    'utils',
    // lib stays reachable here only for lib/devAuth, the build-time flag; the
    // data-access test below still forbids lib/api and lib/supabase.
    'lib',
    'hooks',
    'components/atoms',
    'components/molecules',
    'components/organisms',
    'components/templates',
    'pages',
  ],
  test: Object.keys({}),
}

const COMPONENT_LAYERS = [
  'components/atoms',
  'components/molecules',
  'components/organisms',
  'components/templates',
]

interface ImportRef {
  file: string
  spec: string
  typeOnly: boolean
}

interface SourceFile {
  file: string
  layer: string
  imports: ImportRef[]
}

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g

function sourceFiles(): SourceFile[] {
  const entries = readdirSync(SRC, { recursive: true, withFileTypes: true })
  const files: SourceFile[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!/\.tsx?$/.test(entry.name)) continue
    if (/\.test\.tsx?$/.test(entry.name)) continue
    if (/\.d\.ts$/.test(entry.name)) continue

    const abs = join(entry.parentPath, entry.name)
    const rel = relative(SRC, abs).split(sep).join('/')
    const layer = layerOf(rel)
    if (!layer) continue

    files.push({ file: rel, layer, imports: importsIn(abs, rel) })
  }

  return files
}

function layerOf(rel: string): string | null {
  const known = Object.keys(ALLOWED).sort((a, b) => b.length - a.length)
  return known.find((layer) => rel.startsWith(`${layer}/`)) ?? null
}

function importsIn(abs: string, rel: string): ImportRef[] {
  const source = readFileSync(abs, 'utf8')
  const found: ImportRef[] = []

  for (const match of source.matchAll(IMPORT_RE)) {
    found.push({ file: rel, spec: match[2]!, typeOnly: Boolean(match[1]) })
  }
  return found
}

/** Resolve a relative import to its layer, or null when it leaves src. */
function targetLayer(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null
  const resolved = resolve(dirname(join(SRC, from)), spec)
  const rel = relative(SRC, resolved).split(sep).join('/')
  return layerOf(rel)
}

const FILES = sourceFiles()

describe('atomic design layering', () => {
  test('every source file sits in a declared layer', () => {
    const entries = readdirSync(SRC, { recursive: true, withFileTypes: true })
    const stray = entries
      .filter(
        (e) =>
          e.isFile() &&
          /\.tsx?$/.test(e.name) &&
          !/\.d\.ts$/.test(e.name) &&
          !/\.test\.tsx?$/.test(e.name),
      )
      .map((e) => relative(SRC, join(e.parentPath, e.name)).split(sep).join('/'))
      // main.tsx is the Vite entrypoint and belongs to no layer by design.
      .filter((rel) => rel !== 'main.tsx')
      .filter((rel) => layerOf(rel) === null)

    expect(stray, `files outside every layer: ${stray.join(', ')}`).toEqual([])
  })

  test('no layer imports from a layer above it', () => {
    const violations: string[] = []

    for (const { file, layer, imports } of FILES) {
      for (const ref of imports) {
        const target = targetLayer(file, ref.spec)
        if (target === null || target === layer) continue
        if (!ALLOWED[layer]!.includes(target)) {
          violations.push(`${file} (${layer}) imports ${ref.spec} (${target})`)
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  /**
   * Every read and write goes through a hook.
   *
   * Pages and components take data and callbacks; only `hooks` may call the
   * Supabase layer. That is what keeps a page's test able to mock one seam, and
   * stops query keys and cache invalidation being reinvented per page.
   */
  test('only hooks reach for data', () => {
    const dataModules = ['lib/api', 'lib/supabase']

    // `lib` is exempt because api.ts legitimately builds on supabase.ts; the
    // rule governs the layers above it.
    const violations = FILES.filter((f) => f.layer !== 'hooks' && f.layer !== 'lib')
      .flatMap((f) => f.imports.map((ref) => ({ file: f.file, ref })))
      .filter(({ file, ref }) => {
        if (!ref.spec.startsWith('.')) return false
        const resolved = resolve(dirname(join(SRC, file)), ref.spec)
        const rel = relative(SRC, resolved).split(sep).join('/')
        return dataModules.includes(rel)
      })
      .map(({ file, ref }) => `${file} imports ${ref.spec}`)

    expect(violations, violations.join('\n')).toEqual([])
  })

  test('components take data as props, never from hooks', () => {
    const violations = FILES.filter((f) => COMPONENT_LAYERS.includes(f.layer))
      .flatMap((f) => f.imports.map((ref) => ({ ...f, ref })))
      .filter(({ file, ref }) => targetLayer(file, ref.spec) === 'hooks')
      .map(({ file, ref }) => `${file} imports ${ref.spec}`)

    expect(violations, violations.join('\n')).toEqual([])
  })
})

describe('leaf layers stay pure', () => {
  test('utils import no framework code', () => {
    const violations = FILES.filter((f) => f.layer === 'utils')
      .flatMap((f) => f.imports.map((ref) => ({ file: f.file, ref })))
      .filter(({ ref }) => !ref.spec.startsWith('.') && !ref.typeOnly)
      .map(({ file, ref }) => `${file} imports ${ref.spec}`)

    expect(violations, violations.join('\n')).toEqual([])
  })

  test('constants import nothing at runtime', () => {
    const violations = FILES.filter((f) => f.layer === 'constants')
      .flatMap((f) => f.imports.map((ref) => ({ file: f.file, ref })))
      .filter(({ ref }) => !ref.typeOnly)
      .map(({ file, ref }) => `${file} imports ${ref.spec}`)

    expect(violations, violations.join('\n')).toEqual([])
  })

  test('types declare types only', () => {
    const violations = FILES.filter((f) => f.layer === 'types')
      .flatMap((f) => f.imports.map((ref) => ({ file: f.file, ref })))
      .filter(({ ref }) => !ref.typeOnly)
      .map(({ file, ref }) => `${file} has a value import: ${ref.spec}`)

    expect(violations, violations.join('\n')).toEqual([])
  })
})

describe('layer contents', () => {
  test('component files are PascalCase', () => {
    const bad = FILES.filter((f) => f.layer.startsWith('components/') || f.layer === 'pages')
      .map((f) => f.file.split('/').pop()!)
      .filter((name) => !/^[A-Z][A-Za-z0-9]*\.tsx$/.test(name))

    expect(bad, `not PascalCase .tsx: ${bad.join(', ')}`).toEqual([])
  })

  test('utils, constants and types hold no JSX', () => {
    const bad = FILES.filter((f) => ['utils', 'constants', 'types'].includes(f.layer))
      .map((f) => f.file)
      .filter((file) => file.endsWith('.tsx'))

    expect(bad, `should not be .tsx: ${bad.join(', ')}`).toEqual([])
  })
})
