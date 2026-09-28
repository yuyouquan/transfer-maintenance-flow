import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const modules = new Map();
const requireDependency = createRequire(import.meta.url);
export function loadTs(filename) {
  const absolute = resolve(filename);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const mod = new Module(absolute);
  modules.set(absolute, mod);
  mod.filename = absolute;
  mod.require = (specifier) => {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const base = specifier.startsWith('@/')
        ? resolve('src', specifier.slice(2)) : resolve(dirname(absolute), specifier);
      const target = [base + '.ts', base + '.tsx', resolve(base, 'index.ts')].find(existsSync);
      if (target) return loadTs(target);
    }
    return requireDependency(specifier);
  };
  const output = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  mod._compile(output, absolute);
  return mod.exports;
}
