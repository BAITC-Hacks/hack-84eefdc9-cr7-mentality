// A small TypeScript loader for node:test. Avoids CLI processes and IPC on Windows.
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = specifier.startsWith("@/")
      ? new URL(`../src/${specifier.slice(2)}`, import.meta.url)
      : specifier.startsWith(".") && context.parentURL
        ? new URL(specifier, context.parentURL)
        : null;
    if (url?.protocol === "file:") {
      for (const suffix of ["", ".ts", ".tsx"]) {
        const candidate = `${url.href}${suffix}`;
        if (/\.tsx?$/.test(candidate) && existsSync(fileURLToPath(candidate)))
          return { url: candidate, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const source = ts.transpileModule(
        readFileSync(fileURLToPath(url), "utf8"),
        {
          fileName: fileURLToPath(url),
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        },
      ).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
