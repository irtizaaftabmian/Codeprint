/**
 * Multi-language import/dependency parsers.
 *
 * Each parser extracts raw import strings from source files using regex.
 * Returns two arrays:
 *   - localImports: relative paths that might resolve to project files
 *   - externalImports: package/module names (for context, not graph edges)
 */

import { readFileSync } from "node:fs";

export interface ParsedImports {
  localImports: string[];
  externalImports: string[];
}

// ─── Language definitions ────────────────────────────────────────────────────

export interface LanguageDef {
  id: string;
  name: string;
  extensions: string[];
  parse: (content: string) => ParsedImports;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unique(arr: string[]): string[] {
  return [...new Set(arr)].filter(Boolean);
}

/** Heuristic: does the import string look like a relative/local path? */
function isLocal(imp: string, lang: string): boolean {
  if (lang === "python") {
    // Relative imports start with .
    return imp.startsWith(".");
  }
  if (lang === "go") {
    // Local Go imports contain the module path or start with ./
    return imp.startsWith("./") || imp.startsWith("../");
  }
  if (lang === "rust") {
    return imp.startsWith("crate::") || imp.startsWith("super::") || imp.startsWith("self::");
  }
  if (lang === "c" || lang === "cpp") {
    // #include "file.h" is local, #include <file.h> is system
    return !imp.startsWith("<");
  }
  if (lang === "ruby") {
    return imp.startsWith("./") || imp.startsWith("../");
  }
  if (lang === "php") {
    return imp.startsWith("./") || imp.startsWith("../") || imp.startsWith("/");
  }
  if (lang === "dart") {
    return !imp.startsWith("package:") && !imp.startsWith("dart:");
  }
  if (lang === "zig") {
    return !imp.startsWith("std") && imp.endsWith(".zig");
  }
  if (lang === "lua") {
    return imp.startsWith(".");
  }
  // Java, Kotlin, Swift, C#, Scala, Elixir — imports are typically package names
  return imp.startsWith("./") || imp.startsWith("../");
}

function classify(imports: string[], lang: string): ParsedImports {
  const localImports: string[] = [];
  const externalImports: string[] = [];
  for (const imp of unique(imports)) {
    if (isLocal(imp, lang)) localImports.push(imp);
    else externalImports.push(imp);
  }
  return { localImports, externalImports };
}

// ─── Python ──────────────────────────────────────────────────────────────────

function parsePython(content: string): ParsedImports {
  const imports: string[] = [];

  // import foo / import foo.bar
  for (const m of content.matchAll(/^import\s+([\w.]+)/gm)) {
    imports.push(m[1]);
  }
  // from foo import bar / from . import bar / from ..pkg import bar
  for (const m of content.matchAll(/^from\s+(\.{0,3}[\w.]*)\s+import/gm)) {
    imports.push(m[1] || ".");
  }

  return classify(imports, "python");
}

// ─── Go ──────────────────────────────────────────────────────────────────────

function parseGo(content: string): ParsedImports {
  const imports: string[] = [];

  // Single import: import "path"
  for (const m of content.matchAll(/import\s+"([^"]+)"/g)) {
    imports.push(m[1]);
  }
  // Grouped import: import ( "path" )
  for (const m of content.matchAll(/import\s*\(([\s\S]*?)\)/g)) {
    const block = m[1];
    for (const line of block.matchAll(/\s*(?:\w+\s+)?"([^"]+)"/g)) {
      imports.push(line[1]);
    }
  }

  return classify(imports, "go");
}

// ─── Rust ────────────────────────────────────────────────────────────────────

function parseRust(content: string): ParsedImports {
  const imports: string[] = [];

  // use crate::foo::bar; / use super::foo; / use std::io;
  for (const m of content.matchAll(/use\s+([\w:]+(?:::\{[^}]+\})?)\s*;/g)) {
    imports.push(m[1].split("::").slice(0, 2).join("::"));
  }
  // mod foo;
  for (const m of content.matchAll(/mod\s+(\w+)\s*;/g)) {
    imports.push(`crate::${m[1]}`);
  }
  // extern crate foo;
  for (const m of content.matchAll(/extern\s+crate\s+(\w+)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "rust");
}

// ─── Java ────────────────────────────────────────────────────────────────────

function parseJava(content: string): ParsedImports {
  const imports: string[] = [];

  for (const m of content.matchAll(/import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "java");
}

// ─── Kotlin ──────────────────────────────────────────────────────────────────

function parseKotlin(content: string): ParsedImports {
  const imports: string[] = [];

  for (const m of content.matchAll(/import\s+([\w.]+(?:\.\*)?)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "kotlin");
}

// ─── Swift ───────────────────────────────────────────────────────────────────

function parseSwift(content: string): ParsedImports {
  const imports: string[] = [];

  // import Foundation / import struct Module.Struct
  for (const m of content.matchAll(/import\s+(?:class|struct|enum|protocol|typealias|func|var|let\s+)?(\w[\w.]*)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "swift");
}

// ─── C / C++ ─────────────────────────────────────────────────────────────────

function parseCpp(content: string): ParsedImports {
  const imports: string[] = [];

  // #include "file.h" (local) — keep quotes to distinguish
  for (const m of content.matchAll(/#include\s+"([^"]+)"/g)) {
    imports.push(m[1]);
  }
  // #include <file.h> (system) — prefix with < to mark external
  for (const m of content.matchAll(/#include\s+<([^>]+)>/g)) {
    imports.push(`<${m[1]}`);
  }

  return classify(imports, "cpp");
}

// ─── C# ──────────────────────────────────────────────────────────────────────

function parseCSharp(content: string): ParsedImports {
  const imports: string[] = [];

  for (const m of content.matchAll(/using\s+(?:static\s+)?([\w.]+)\s*;/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "csharp");
}

// ─── Ruby ────────────────────────────────────────────────────────────────────

function parseRuby(content: string): ParsedImports {
  const imports: string[] = [];

  // require "foo" / require 'foo'
  for (const m of content.matchAll(/require\s+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }
  // require_relative "foo"
  for (const m of content.matchAll(/require_relative\s+['"]([^'"]+)['"]/g)) {
    imports.push(`./${m[1]}`);
  }
  // load "foo.rb"
  for (const m of content.matchAll(/load\s+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "ruby");
}

// ─── PHP ─────────────────────────────────────────────────────────────────────

function parsePhp(content: string): ParsedImports {
  const imports: string[] = [];

  // use Namespace\Class;
  for (const m of content.matchAll(/use\s+([\w\\]+)(?:\s+as\s+\w+)?\s*;/g)) {
    imports.push(m[1]);
  }
  // require/include/require_once/include_once "file"
  for (const m of content.matchAll(/(?:require|include)(?:_once)?\s*\(?['"]([^'"]+)['"]\)?/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "php");
}

// ─── Dart ────────────────────────────────────────────────────────────────────

function parseDart(content: string): ParsedImports {
  const imports: string[] = [];

  // import 'package:foo/bar.dart'; / import 'file.dart';
  for (const m of content.matchAll(/import\s+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }
  // export 'file.dart';
  for (const m of content.matchAll(/export\s+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }
  // part 'file.dart';
  for (const m of content.matchAll(/part\s+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "dart");
}

// ─── Scala ───────────────────────────────────────────────────────────────────

function parseScala(content: string): ParsedImports {
  const imports: string[] = [];

  for (const m of content.matchAll(/import\s+([\w.]+(?:\.\{[^}]+\}|\.\w+|\._)?)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "scala");
}

// ─── Elixir ──────────────────────────────────────────────────────────────────

function parseElixir(content: string): ParsedImports {
  const imports: string[] = [];

  // import Module / alias Module / use Module / require Module
  for (const m of content.matchAll(/(?:import|alias|use|require)\s+([A-Z][\w.]*)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "elixir");
}

// ─── Zig ─────────────────────────────────────────────────────────────────────

function parseZig(content: string): ParsedImports {
  const imports: string[] = [];

  // @import("file.zig") / @import("std")
  for (const m of content.matchAll(/@import\("([^"]+)"\)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "zig");
}

// ─── Lua ─────────────────────────────────────────────────────────────────────

function parseLua(content: string): ParsedImports {
  const imports: string[] = [];

  // require("module") / require "module"
  for (const m of content.matchAll(/require\s*\(?["']([^"']+)["']\)?/g)) {
    imports.push(m[1]);
  }
  // dofile("file.lua")
  for (const m of content.matchAll(/dofile\s*\(["']([^"']+)["']\)/g)) {
    imports.push(m[1]);
  }

  return classify(imports, "lua");
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const LANGUAGES: LanguageDef[] = [
  { id: "python",  name: "Python",   extensions: [".py"],                         parse: parsePython },
  { id: "go",      name: "Go",       extensions: [".go"],                         parse: parseGo },
  { id: "rust",    name: "Rust",     extensions: [".rs"],                         parse: parseRust },
  { id: "java",    name: "Java",     extensions: [".java"],                       parse: parseJava },
  { id: "kotlin",  name: "Kotlin",   extensions: [".kt", ".kts"],                parse: parseKotlin },
  { id: "swift",   name: "Swift",    extensions: [".swift"],                      parse: parseSwift },
  { id: "cpp",     name: "C/C++",    extensions: [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx", ".hxx"], parse: parseCpp },
  { id: "csharp",  name: "C#",       extensions: [".cs"],                         parse: parseCSharp },
  { id: "ruby",    name: "Ruby",     extensions: [".rb"],                         parse: parseRuby },
  { id: "php",     name: "PHP",      extensions: [".php"],                        parse: parsePhp },
  { id: "dart",    name: "Dart",     extensions: [".dart"],                       parse: parseDart },
  { id: "scala",   name: "Scala",    extensions: [".scala"],                      parse: parseScala },
  { id: "elixir",  name: "Elixir",   extensions: [".ex", ".exs"],                parse: parseElixir },
  { id: "zig",     name: "Zig",      extensions: [".zig"],                        parse: parseZig },
  { id: "lua",     name: "Lua",      extensions: [".lua"],                        parse: parseLua },
];

/** All file extensions we can analyze (excluding JS/TS handled by madge). */
export const ALL_EXTENSIONS = LANGUAGES.flatMap((l) => l.extensions);

/** Map extension → language for quick lookup. */
export const EXT_TO_LANG = new Map<string, LanguageDef>();
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) {
    EXT_TO_LANG.set(ext, lang);
  }
}

/** Parse a file's imports based on its extension. */
export function parseFile(filePath: string, ext: string): ParsedImports | null {
  const lang = EXT_TO_LANG.get(ext);
  if (!lang) return null;

  try {
    const content = readFileSync(filePath, "utf8");
    return lang.parse(content);
  } catch {
    return null;
  }
}
