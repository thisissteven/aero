const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  // JavaScript / TypeScript
  javascript: 'js',
  jsx: 'jsx',
  typescript: 'ts',
  tsx: 'tsx',

  // Web
  html: 'html',
  handlebars: 'hbs',
  twig: 'twig',
  liquid: 'liquid',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  stylus: 'styl',

  // Data / config
  json: 'json',
  jsonc: 'jsonc',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  ini: 'ini',
  properties: 'properties',

  // Shell / scripts
  bash: 'sh',
  powershell: 'ps1',
  batch: 'bat',

  // Text / docs
  text: 'txt',
  markdown: 'md',
  asciidoc: 'adoc',
  latex: 'tex',
  bibtex: 'bib',

  // Python / Ruby / PHP
  python: 'py',
  ruby: 'rb',
  erb: 'erb',
  php: 'php',

  // JVM
  java: 'java',
  kotlin: 'kt',
  scala: 'scala',
  groovy: 'groovy',

  // C family
  c: 'c',
  cpp: 'cpp',
  objectivec: 'm',
  csharp: 'cs',
  fsharp: 'fs',
  vbnet: 'vb',

  // Other languages
  go: 'go',
  rust: 'rs',
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  perl: 'pl',
  r: 'r',
  julia: 'jl',
  haskell: 'hs',
  elixir: 'ex',
  erlang: 'erl',
  clojure: 'clj',
  lisp: 'lisp',
  scheme: 'scm',
  ocaml: 'ml',
  reason: 're',
  nim: 'nim',
  zig: 'zig',
  v: 'v',
  crystal: 'cr',
  d: 'd',

  // Query / blockchain
  sql: 'sql',
  graphql: 'graphql',
  solidity: 'sol',

  // Assembly / shaders
  nasm: 'asm',
  wasm: 'wat',
  glsl: 'glsl',
  hlsl: 'hlsl',
  cg: 'cg',

  // Infra / config
  nix: 'nix',
  hcl: 'hcl',
  puppet: 'pp',
  apacheconf: 'htaccess',
  nginx: 'nginx',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  cmake: 'CMakeLists.txt',

  // Misc
  vim: 'vim',
  diff: 'diff',
  prisma: 'prisma',
  protobuf: 'proto',
  thrift: 'thrift',
  mermaid: 'mmd',
  mmd: 'mmd',
  svg: 'svg',
};

export function getExtensionFromLanguage(language: string) {
  const normalized = language.trim().toLowerCase();
  return LANGUAGE_TO_EXTENSION[normalized] ?? 'text';
}
