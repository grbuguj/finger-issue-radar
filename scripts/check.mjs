// 하네스: index.html 안의 이슈 데이터가 issue-brief Skill 규칙을 지키는지 점검합니다.
// 사용: node scripts/check.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = html.slice(html.indexOf("const ORG = ["), html.indexOf("/* ═════════ 상태 ═════════ */"));
const ctx = {};
vm.runInNewContext(`${js}\nthis.out = { ORGS, INST, CAT, ISSUES, QUEUE, LAWS, KIND };`, ctx);
const { ORGS, INST, CAT, ISSUES, QUEUE, LAWS, KIND } = ctx.out;
const orgIds = new Set(ORGS.map((o) => o.id));

let pass = 0, fail = 0;
const check = (ok, msg) => { ok ? pass++ : (fail++, console.log("  ✗ " + msg)); };

console.log(`이슈 ${ISSUES.length + QUEUE.length}건 · 법령 ${LAWS.length}건 점검`);
for (const it of [...ISSUES, ...QUEUE]) {
  const id = `#${it.id}`;
  check(INST[it.inst], `${id} 발표 기관 코드가 없음: ${it.inst}`);
  check(CAT[it.cat], `${id} 분류 코드가 없음: ${it.cat}`);
  check([1, 2, 3].includes(it.imp), `${id} 중요도는 1~3`);
  check(it.title.length <= 60, `${id} 제목 60자 초과`);
  check(Array.isArray(it.sum) && it.sum.length === 3, `${id} 요약은 정확히 세 줄`);
  check(it.kw.length >= 2 && it.kw.length <= 6, `${id} 키워드 2~6개`);
  const imps = Object.entries(it.impacts);
  check(imps.length > 0, `${id} 영향 본부가 하나 이상 있어야 함`);
  for (const [o, [txt, basis]] of imps) {
    check(orgIds.has(o) && o !== "all", `${id} 없는 본부 id: ${o}`);
    check(basis === "f" || basis === "h", `${id} ${o} 근거 구분은 f(원문 근거) 또는 h(가설)`);
    check(txt && txt.length <= 80, `${id} ${o} 영향 문장은 80자 이내`);
  }
  check(!("verdict" in it), `${id} 판정은 사람이 함 — 데이터에 판정을 넣지 않음`);
}
for (const l of LAWS) {
  check(KIND[l.kind], `${l.name} 구분 코드가 없음`);
  check(l.orgs.every((o) => orgIds.has(o)), `${l.name} 없는 본부 id`);
  check(l.kind === "bill" ? l.eff === null : l.eff > 0, `${l.name} 시행일(D-day) 형식`);
}

const hyp = [...ISSUES, ...QUEUE].flatMap((i) => Object.values(i.impacts)).filter(([, b]) => b === "h").length;
const total = [...ISSUES, ...QUEUE].flatMap((i) => Object.values(i.impacts)).length;
console.log(`본부 영향 ${total}건 중 가설 ${hyp}건 (${Math.round((hyp / total) * 100)}%) — 판정자 확인 대상`);
console.log(fail ? `✗ ${fail}건 실패 · ${pass}건 통과` : `✓ 전체 ${pass}건 통과`);
process.exit(fail ? 1 : 0);
