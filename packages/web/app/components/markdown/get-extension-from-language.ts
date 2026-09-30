const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  // JavaScript / TypeScript
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  typescript: 'ts',
  ts: 'ts',
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
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  ini: 'ini',
  properties: 'properties',

  // Shell / scripts
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  shellscript: 'sh',
  zsh: 'sh',
  console: 'sh',
  powershell: 'ps1',
  ps1: 'ps1',
  batch: 'bat',
  bat: 'bat',
  cmd: 'bat',

  // Text / docs
  text: 'txt',
  txt: 'txt',
  plaintext: 'txt',
  plain: 'txt',
  markdown: 'md',
  md: 'md',
  asciidoc: 'adoc',
  latex: 'tex',
  bibtex: 'bib',

  // Python / Ruby / PHP
  python: 'py',
  py: 'py',
  ruby: 'rb',
  rb: 'rb',
  erb: 'erb',
  php: 'php',

  // JVM
  java: 'java',
  kotlin: 'kt',
  kt: 'kt',
  scala: 'scala',
  groovy: 'groovy',

  // C family
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  objectivec: 'm',
  'objective-c': 'm',
  objc: 'm',
  csharp: 'cs',
  'c#': 'cs',
  cs: 'cs',
  fsharp: 'fs',
  fs: 'fs',
  vbnet: 'vb',
  vb: 'vb',

  // Other languages
  go: 'go',
  golang: 'go',
  rust: 'rs',
  rs: 'rs',
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
  docker: 'Dockerfile',
  makefile: 'Makefile',
  make: 'Makefile',
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
