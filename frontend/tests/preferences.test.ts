import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { interpolate, parseLocale, parseTheme } from "../src/lib/preferences";
import { money } from "../src/lib/format";

test("stored preferences accept supported values and safely fall back", () => {
  for (const locale of ["kk", "ru", "en"]) assert.equal(parseLocale(locale), locale);
  assert.equal(parseLocale("fr"), "ru");
  assert.equal(parseLocale(), "ru");
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("invalid"), "light");
});

test("translation interpolation preserves identifiers and does not evaluate replacement text", () => {
  assert.equal(interpolate("Node {gid}: {count}", { gid: "9007199254740993", count: 0 }), "Node 9007199254740993: 0");
  assert.equal(interpolate("{message}", { message: "$& <script>literal</script>" }), "$& <script>literal</script>");
  assert.equal(interpolate("Missing {value}"), "Missing {value}");
});

test("localized currency keeps exact amounts beyond Number.MAX_SAFE_INTEGER", () => {
  assert.equal(money("9007199254740993.99", true, "en-US").replaceAll(/\s/g, ""), "9,007,199,254,740,993.99₸");
  assert.equal(money("9007199254740993.99", true, "kk-KZ").replaceAll(/\s/g, ""), "9007199254740993,99₸");
  assert.equal(money("999.995", false, "en-US"), "1,000.00");
});

for (const namespace of ["common", "landing", "workspace", "extras"]) {
  test(`${namespace}: all three language catalogs have matching nonempty messages and placeholders`, () => {
    const read = (locale: string): Record<string, string> => JSON.parse(readFileSync(new URL(`../src/locales/${locale}/${namespace}.json`, import.meta.url), "utf8"));
    const ru = read("ru");
    assert.ok(Object.keys(ru).length > 0);
    for (const locale of ["kk", "en"]) {
      const target = read(locale);
      assert.deepEqual(Object.keys(target).sort(), Object.keys(ru).sort(), `${locale} has missing or extra keys`);
      for (const [key, value] of Object.entries(target)) {
        assert.equal(typeof value, "string", `${locale}:${key}`);
        assert.ok(value.trim(), `${locale}:${key} is empty`);
        const placeholders = (text: string) => [...new Set(text.match(/\{[\w.]+\}/g) ?? [])].sort();
        assert.deepEqual(placeholders(value), placeholders(ru[key]), `${locale}:${key} interpolation differs`);
      }
    }
  });
}
