"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import TypeIt from "typeit-react";

type ReplayFrame = {
  id: string;
  composed: string;
  committed: string;
  candidates: string[];
  selected?: number;
  pressedKeys: string[];
  status?: string;
  durationMs?: number;
};

const TARGET_SENTENCE =
  "今天 meeting 在 3:30pm 开始，地点 A 区 3F，请带 Laptop（含 HDMI）。";

const DEMO_QUERY =
  "jintianmeetingzai3:30pmkaishi,didianAqu3F,qingdaiLaptop(hanHDMI).";

const NAV_LINKS = [
  { href: "#try", label: "体验" },
  { href: "#features", label: "能力" },
  { href: "#compare", label: "对比" },
  { href: "#engine", label: "机制" },
  { href: "#download", label: "下载" },
  { href: "#contact", label: "联系" },
];

const SYSTEM_FRAMES: ReplayFrame[] = [
  {
    id: "s1",
    composed: "j",
    committed: "",
    candidates: ["就", "将", "今", "见"],
    selected: 1,
    pressedKeys: ["J"],
  },
  {
    id: "s2",
    composed: "jin",
    committed: "",
    candidates: ["今", "进", "金", "仅"],
    selected: 1,
    pressedKeys: ["I", "N"],
  },
  {
    id: "s3",
    composed: "jintian",
    committed: "",
    candidates: ["今天", "金天", "惊天"],
    selected: 1,
    pressedKeys: ["T", "I", "A", "N"],
  },
  {
    id: "s4",
    composed: "",
    committed: "今天 ",
    candidates: ["今天", "金天", "惊天"],
    selected: 1,
    pressedKeys: ["Space"],
    status: "空格选词",
    durationMs: 720,
  },
  {
    id: "s5",
    composed: "meeting",
    committed: "今天 ",
    candidates: ["meeting", "没听", "美婷"],
    selected: 1,
    pressedKeys: ["M", "E", "E", "T", "I", "N", "G"],
  },
  {
    id: "s6",
    composed: "",
    committed: "今天 meeting ",
    candidates: ["meeting", "没听", "美婷"],
    selected: 1,
    pressedKeys: ["Space"],
    status: "空格选词",
    durationMs: 720,
  },
  {
    id: "s7",
    composed: "zai",
    committed: "今天 meeting ",
    candidates: ["在", "再", "摘"],
    selected: 1,
    pressedKeys: ["Z", "A", "I"],
  },
  {
    id: "s8",
    composed: "",
    committed: "今天 meeting 在 ",
    candidates: ["在", "再", "摘"],
    selected: 1,
    pressedKeys: ["Space"],
    status: "空格选词",
    durationMs: 720,
  },
  {
    id: "s9",
    composed: "3:30pm",
    committed: "今天 meeting 在 ",
    candidates: [],
    pressedKeys: ["Ctrl", "Space", "3", ";", "3", "0", "P", "M"],
    status: "切换英文输入",
    durationMs: 780,
  },
  {
    id: "s10",
    composed: "kaishi",
    committed: "今天 meeting 在 3:30pm ",
    candidates: ["开始", "开市", "开示"],
    selected: 1,
    pressedKeys: ["Ctrl", "Space", "K", "A", "I", "S", "H", "I"],
    status: "切回中文输入",
  },
  {
    id: "s11",
    composed: "",
    committed: "今天 meeting 在 3:30pm 开始，",
    candidates: ["开始", "开市", "开示"],
    selected: 1,
    pressedKeys: ["Space", ","],
    durationMs: 780,
  },
  {
    id: "s12",
    composed: "didian",
    committed: "今天 meeting 在 3:30pm 开始，",
    candidates: ["地点", "低点", "地垫"],
    selected: 1,
    pressedKeys: ["D", "I", "D", "I", "A", "N"],
  },
  {
    id: "s13",
    composed: "",
    committed: "今天 meeting 在 3:30pm 开始，地点 A 区 3F，",
    candidates: [],
    pressedKeys: [
      "Enter",
      "Ctrl",
      "Space",
      "Shift+A",
      "Ctrl",
      "Space",
      "Q",
      "U",
      "2",
      "Ctrl",
      "Space",
      "3",
      "Shift+F",
      "Ctrl",
      "Space",
      ",",
    ],
    status: "中英来回切换",
    durationMs: 860,
  },
  {
    id: "s14",
    composed: "qingdai",
    committed: "今天 meeting 在 3:30pm 开始，地点 A 区 3F，",
    candidates: ["请带", "青黛", "清代"],
    selected: 1,
    pressedKeys: ["Q", "I", "N", "G", "D", "A", "I"],
  },
  {
    id: "s15",
    composed: "",
    committed: TARGET_SENTENCE,
    candidates: [],
    pressedKeys: [
      "Space",
      "Ctrl",
      "Space",
      "Shift+L",
      "A",
      "P",
      "T",
      "O",
      "P",
      "(",
      "Ctrl",
      "Space",
      "H",
      "A",
      "N",
      "Ctrl",
      "Space",
      "Shift+H",
      "D",
      "M",
      "I",
      ".",
    ],
    status: "完成整句",
    durationMs: 1000,
  },
];

const SUPER_CANDIDATE_STOPS = [
  { at: 1, text: "今" },
  { at: 7, text: "今天" },
  { at: 14, text: "今天 meeting" },
  { at: 22, text: "今天 meeting 在 3:30pm" },
  { at: 30, text: "今天 meeting 在 3:30pm 开始，" },
  { at: 42, text: "今天 meeting 在 3:30pm 开始，地点 A 区 3F，" },
  { at: 56, text: "今天 meeting 在 3:30pm 开始，地点 A 区 3F，请带 Laptop（" },
  { at: 65, text: TARGET_SENTENCE },
];

function superCandidateAt(length: number) {
  let current = "";
  for (const stop of SUPER_CANDIDATE_STOPS) {
    if (length < stop.at) break;
    current = stop.text;
  }
  return current;
}

function superPressedKey(ch: string) {
  if (/[a-z]/.test(ch)) return ch.toUpperCase();
  if (/[A-Z]/.test(ch)) return `Shift+${ch}`;
  if (ch === ":") return "Shift+;";
  if (ch === "(") return "Shift+9";
  if (ch === ")") return "Shift+0";
  return ch;
}

function buildSuperFrames() {
  const frames: ReplayFrame[] = [];
  let previousPrediction = "";

  Array.from(DEMO_QUERY).forEach((ch, index) => {
    const length = index + 1;
    const markedText = DEMO_QUERY.slice(0, length);
    const nextPrediction = superCandidateAt(length);

    frames.push({
      id: `u-key-${length}`,
      composed: markedText,
      committed: "",
      candidates: previousPrediction ? [previousPrediction] : [],
      pressedKeys: [superPressedKey(ch)],
      status: "连续输入",
      durationMs: 180,
    });

    frames.push({
      id: `u-infer-${length}`,
      composed: markedText,
      committed: "",
      candidates: [nextPrediction],
      pressedKeys: [],
      status: "推理更新",
      durationMs: 180,
    });

    previousPrediction = nextPrediction;
  });

  frames.push({
    id: "u-end",
    composed: "",
    committed: TARGET_SENTENCE,
    candidates: [],
    pressedKeys: ["Enter"],
    status: "一次提交",
    durationMs: 620,
  });

  return frames;
}

const SUPER_FRAMES: ReplayFrame[] = buildSuperFrames();

const FEATURE_CARDS = [
  {
    title: "整句输入",
    description: "输入完整拼音序列，一次性输出整句中文。减少逐字选词的中断，保持输入连续性。",
  },
  {
    title: "中英混输",
    description: "\"jintian3dianmeeting\" → \"今天3点meeting\"。中文、英文、数字无需切换，一次输入完成。",
  },
  {
    title: "模糊容错",
    description: "\"zhomu\" → \"周末\"，\"nv\" → \"女\"，\"lnag\" → \"狼\"。能够处理缩写、模糊音与拼写偏差。",
  },
  {
    title: "上下文纠正",
    description: "\"genshui\" 先输出 \"跟谁\"，继续输入 \"genshuizheta\" 自动修正为 \"跟随着他\"。后文驱动前文优化。",
  },
  {
    title: "自定义词库",
    description: "支持添加专有名词与行业术语，输入时自动处理并优先匹配，覆盖个性化场景。",
  },
  {
    title: "完全离线",
    description: "全部运算在本地完成。不联网、不上传数据、不追踪行为、无广告。",
  },
];

const ENGINE_LINES = [
  {
    label: "推理引擎",
    value: "神经网络整句理解",
    detail: "基于深度学习模型对完整拼音序列进行语义分析，替代传统的词频匹配方案。",
  },
  {
    label: "解码策略",
    value: "多路径搜索",
    detail: "同时评估多种候选组合，选出全局最优结果，避免逐字贪心导致的上下文偏差。",
  },
  {
    label: "运行环境",
    value: "端侧离线推理",
    detail: "模型部署在本地设备，利用硬件加速完成推理，无需网络连接。",
  },
];

function frameDuration(frame: ReplayFrame) {
  if (frame.durationMs) return frame.durationMs;

  const base = (() => {
    if (frame.pressedKeys.includes("Space") || frame.pressedKeys.includes("Enter")) {
      return 760;
    }
    if (frame.candidates.length === 0) return 520;
    return 620;
  })();

  const keyRevealCost = Math.max(0, frame.pressedKeys.length - 1) * 120;
  return base + keyRevealCost;
}

function useReplay(frames: ReplayFrame[]) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIndex((prev) => (prev + 1 >= frames.length ? 0 : prev + 1));
    }, frameDuration(frames[index]));

    return () => window.clearTimeout(timeout);
  }, [frames, index]);

  return {
    frame: frames[index],
    index,
    total: frames.length,
    progress: (index + 1) / frames.length,
  };
}

function CandidateBar({
  candidates,
  selected,
  tone,
}: {
  candidates: string[];
  selected?: number;
  tone: "system" | "super";
}) {
  if (!candidates.length) {
    return <p className="text-[12px] text-white/30">无候选弹窗</p>;
  }

  const activeIndex = Math.max(0, (selected ?? 1) - 1);

  return (
    <div className="flex flex-wrap gap-1.5">
      {candidates.slice(0, 4).map((item, index) => {
        const active = tone === "super" ? index === 0 : index === activeIndex;
        return (
          <span
            key={`${tone}-${item}-${index}`}
            className={`inline-flex h-6 items-center border px-2 text-[12px] ${
              active
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/10 text-white/60"
            }`}
          >
            {tone === "system" ? `${index + 1}. ` : ""}
            {item}
          </span>
        );
      })}
    </div>
  );
}

function KeyStrip({ keys, frameId }: { keys: string[]; frameId: string }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!keys.length) {
      setVisibleCount(0);
      return;
    }

    setVisibleCount(1);
    let next = 1;
    const timer = window.setInterval(() => {
      next += 1;
      setVisibleCount(next);
      if (next >= keys.length) {
        window.clearInterval(timer);
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [frameId, keys]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.slice(0, Math.min(8, visibleCount)).map((key, index) => (
        <span
          key={`${frameId}-${key}-${index}`}
          className="inline-flex h-6 items-center border border-white/20 px-2 font-mono text-[11px] uppercase tracking-[0.8px] text-white/70"
        >
          {key}
        </span>
      ))}
    </div>
  );
}

function ReplayPanel({
  title,
  tone,
  frames,
}: {
  title: string;
  tone: "system" | "super";
  frames: ReplayFrame[];
}) {
  const { frame, index } = useReplay(frames);
  const composedToneClass = tone === "super" ? "text-white" : "text-white/70";
  const keyStats = useMemo(() => {
    let running = 0;
    const cumulative = frames.map((item) => {
      running += item.pressedKeys.length;
      return running;
    });
    return { total: running, cumulative };
  }, [frames]);
  const keyCount = keyStats.cumulative[index] ?? 0;
  const keyProgress = keyStats.total > 0 ? keyCount / keyStats.total : 0;

  return (
    <article className="surface p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">
            {title}
          </p>
          <p className="mt-1 text-[12px] text-white/40">
            keys {keyCount}/{keyStats.total}
          </p>
        </div>
        <div className="w-[120px] border border-white/20 p-1">
          <div
            className="h-1 bg-white"
            style={{
              width:
                keyCount === 0 ? "0%" : `${Math.max(6, keyProgress * 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="border border-white/10 p-4" style={{ minHeight: 290 }}>
        <div style={{ minHeight: 72 }}>
          <p className="text-[16px] leading-[1.5] whitespace-pre-wrap">
            <span className="text-white">{frame.committed}</span>
            {frame.composed ? (
              <span className={`border-b border-white/60 ${composedToneClass}`}>
                {frame.composed}
              </span>
            ) : null}
          </p>
        </div>

        <p className="mt-2 min-h-5 text-[12px] text-white/40">{frame.status ?? "输入中"}</p>

        <div className="mt-3 border-t border-white/10 pt-3" style={{ minHeight: 56 }}>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[1px] text-white/40">
            Candidates
          </p>
          <CandidateBar
            candidates={frame.candidates}
            selected={frame.selected}
            tone={tone}
          />
        </div>

        <div className="mt-3 border-t border-white/10 pt-3" style={{ minHeight: 56 }}>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[1px] text-white/40">
            Pressed Keys
          </p>
          <KeyStrip keys={frame.pressedKeys} frameId={frame.id} />
        </div>
      </div>
    </article>
  );
}

// 演示案例
const DEMO_CASES = [
  { input: "zhege bug fixle,code reviewyixiaba", output: "这个 bug fix了，code review一下吧" },
  { input: "npm run dev", output: "npm run dev" },
  { input: "git merge develop", output: "git merge develop" },
  { input: "jintianxiawu3diankaimeeting,qingdaiLaptop", output: "今天下午3点开meeting，请带Laptop" },
  { input: "gungungun,dashab,zaiyebuxiangkanjiannile", output: "滚滚滚，大傻逼，再也不想看见你了" },
  { input: "xianzhixing git log --oneline -10 kankancommitjilu", output: "先执行 git log --oneline -10 看看commit记录" },
  { input: "wangzhangfagedocgeiSarah,tade email shisarah@test.com", output: "王章发个doc给Sarah，他的 email 是sarah@test.com" },
  { input: "mingtianzaochen9:30yougeshipinghuiyi", output: "明天早晨9:30有个视频会议" },
  { input: "zhegexiangmu deadline shixiazhouyi,haisheng3tianlezanmenjiajinba", output: "这个项目 deadline 是下周一，还剩3天了咱们加紧吧" },
  { input: "bangwomaidian A4zhi,2bao,zaijia1heSHARPbixindui", output: "帮我买点 A4纸，2包，再加1盒SHARP笔芯对" },
  { input: "wanshangdianying7:45kaishi,women7:00zaimendengba", output: "晚上电影7:45开始，我们7:00在门口等吧" },
  { input: "qingquerenServer3deIP,duankoushi8080haishi443", output: "请确认Server3的IP，端口是8080还是443" },
  { input: "genjuhetongdi12tiaoyueding,yifangxuzai30tianneifukuan", output: "根据合同第12条约定，乙方须在30天内付款" },
  { input: "bencianjianshuzhengju3fen,qizhong DNA jiandingbaogao1fen", output: "本次案件书证据3份，其中 DNA 鉴定报告1份" },
  { input: "docker buildchenggongle,danshikubernetes podqidongbaoOOMKilled", output: "docker build成功了，但是kubernetes pod启动报OOMKilled" },
  { input: "nishibushiyoubing,shuohuadoubudongnaozima", output: "你是不是有病，说话都不动脑子吗" },
  { input: "laozizaojiushuoguole,nibuting,xianzaizhidaocuoleba", output: "老子早就说过了，你不听，现在知道错了吧" },
];

function LiveDemo() {
  // 模式: "auto" 自动演示 | "user" 用户输入
  const [mode, setMode] = useState<"auto" | "user">("auto");

  // 自动演示状态
  const [caseIndex, setCaseIndex] = useState(0);
  const [demoOutput, setDemoOutput] = useState("");
  const [showDemoOutput, setShowDemoOutput] = useState(false);
  const typeItKey = useRef(0);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 用户输入状态
  const [userInput, setUserInput] = useState("");
  const [userResult, setUserResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentCase = DEMO_CASES[caseIndex % DEMO_CASES.length];

  const handleTypeComplete = useCallback(() => {
    setDemoOutput(currentCase.output);
    setShowDemoOutput(true);
    nextTimer.current = setTimeout(() => {
      setShowDemoOutput(false);
      setDemoOutput("");
      setCaseIndex((prev) => prev + 1);
      typeItKey.current += 1;
    }, 2500);
  }, [currentCase.output]);

  // 切换到用户模式
  function enterUserMode() {
    if (mode === "auto") {
      if (nextTimer.current) clearTimeout(nextTimer.current);
      setMode("user");
    }
  }

  // 失去焦点时恢复自动演示
  function exitUserMode() {
    setMode("auto");
    setUserInput("");
    setUserResult("");
    setDurationMs(null);
    setError("");
    typeItKey.current += 1;
  }

  function doInfer(pinyin: string) {
    if (!pinyin.trim()) {
      setUserResult("");
      setDurationMs(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const start = performance.now();
    fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: pinyin.trim() }),
    })
      .then(async (res) => {
        const elapsed = Math.round(performance.now() - start);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "请求失败");
        const text =
          typeof data.text === "string" ? data.text
          : typeof data.result === "string" ? data.result
          : Array.isArray(data.candidates) && data.candidates.length > 0
            ? (typeof data.candidates[0] === "string" ? data.candidates[0] : data.candidates[0]?.text ?? "")
            : "";
        setUserResult(text || "未识别到结果");
        setDurationMs(elapsed);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "请求失败");
        setUserResult("");
        setDurationMs(null);
      })
      .finally(() => setLoading(false));
  }

  function handleUserInput(value: string) {
    setUserInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doInfer(value), 300);
  }

  return (
    <div className="mt-10 w-full max-w-[700px] mx-auto surface p-8">
      {/* 输入区 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] text-white/40">输入</p>
          <p className="font-mono text-[11px] text-white/30">
            {mode === "auto" ? "自动演示中 · 点击输入框体验" : ""}
            {mode === "user" && durationMs !== null ? `${durationMs}ms` : ""}
          </p>
        </div>

        {mode === "auto" ? (
          <div
            className="border border-white/10 px-4 py-3 font-mono text-[18px] text-white/80 cursor-text"
            style={{ minHeight: 52 }}
            onClick={enterUserMode}
          >
            <TypeIt
              key={typeItKey.current}
              options={{
                speed: 50,
                afterComplete: handleTypeComplete,
                cursor: true,
                waitUntilVisible: true,
              }}
            >
              {currentCase.input}
            </TypeIt>
          </div>
        ) : (
          <input
            type="text"
            autoFocus
            value={userInput}
            onChange={(e) => handleUserInput(e.target.value)}
            onBlur={exitUserMode}
            placeholder="输入拼音，如 nihaoshijie"
            className="h-[52px] w-full border border-white/20 bg-white/[0.03] px-4 font-mono text-[18px] outline-none placeholder:text-white/30"
          />
        )}
      </div>

      {/* 输出区 */}
      <div>
        <p className="text-[13px] text-white/40 mb-2">输出</p>
        <div
          className="border border-white/10 px-4 py-3 text-[22px] transition-opacity duration-500"
          style={{ minHeight: 52 }}
        >
          {mode === "auto" ? (
            showDemoOutput ? (
              <span className="text-white">{demoOutput}</span>
            ) : (
              <span className="text-white/20">等待输入完成...</span>
            )
          ) : loading ? (
            <span className="text-white/40">推理中...</span>
          ) : error ? (
            <span className="text-red-400/80">{error}</span>
          ) : userResult ? (
            <span className="text-white">{userResult}</span>
          ) : (
            <span className="text-white/20">输入拼音后显示结果</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#1f2228] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1f2228]/95">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="flex items-center gap-2 font-mono text-[14px] uppercase tracking-[1.4px] text-white"
          >
            <img src="/icon.svg" alt="超级输入法" className="h-6 w-6" />
            超级输入法
          </a>

          <nav className="nav-desktop">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[14px] text-white/80 transition-colors hover:text-white/50"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="nav-desktop-btn">
            <a href="#download" className="mono-button mono-button-primary">
              DOWNLOAD
            </a>
          </div>

          <button
            type="button"
            className="mono-button mono-button-ghost px-4 nav-mobile-only"
            aria-label="切换导航菜单"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            MENU
          </button>
        </div>

        {mobileOpen ? (
          <nav className="border-t border-white/10 px-4 py-3 nav-mobile-only">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="border border-white/10 px-3 py-2 text-[14px] text-white/80 transition-colors hover:border-white/20 hover:text-white/50"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main id="top">
        <section
          className="section-enter border-b border-white/10"
          style={{ "--enter-index": 0 } as CSSProperties}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
            <span className="mono-tag">AI 端到端输入法</span>
            <h1 className="mt-8 font-mono text-[clamp(3.5rem,15vw,13rem)] leading-[0.9] font-light">
              超级输入法
            </h1>
            <p className="mt-8 max-w-[760px] text-[16px] leading-[1.5] text-white/70 sm:text-[18px]">
              输入不中断、思路不打断，中文、英文、数字、标点混合输入，想到什么输入什么，端到端直出结果。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
              <p className="flex items-center gap-2 text-[15px] text-white/80">
                <span className="text-white/40">—</span> 不联网、不收集隐私、无广告
              </p>
              <p className="flex items-center gap-2 text-[15px] text-white/80">
                <span className="text-white/40">—</span> 端到端技术，字符输入，中文直出，无中间编码
              </p>
              <p className="flex items-center gap-2 text-[15px] text-white/80">
                <span className="text-white/40">—</span> 无需记住中英文状态，直接输入，会自动处理
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#download" className="mono-button mono-button-primary">
                DOWNLOAD
              </a>
              <a href="#features" className="mono-button mono-button-ghost">
                VIEW FEATURES
              </a>
            </div>
          </div>
        </section>

        <section
          id="try"
          className="section-enter border-b border-white/10"
          style={{ "--enter-index": 1 } as CSSProperties}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-[1.2] font-normal">在线体验</h2>
            <p className="mt-4 max-w-[760px] text-[16px] leading-[1.5] text-white/70">
              点击输入框试试，或看自动演示感受效果。
            </p>
            <LiveDemo />
          </div>
        </section>

        <section
          id="features"
          className="section-enter border-b border-white/10"
          style={{ "--enter-index": 2 } as CSSProperties}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-[1.2] font-normal">核心能力</h2>
            <p className="mt-4 max-w-[760px] text-[16px] leading-[1.5] text-white/70">
              不靠视觉装饰表达价值。只展示输入效率与质量提升本身。
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_CARDS.map((item) => (
                <article key={item.title} className="surface p-6">
                  <div className="mono-tag">Feature</div>
                  <h3 className="mt-4 text-[22px] leading-[1.25] font-normal">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[16px] leading-[1.5] text-white/70">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="compare"
          className="section-enter border-b border-white/10"
          style={{ "--enter-index": 3 } as CSSProperties}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-[1.2] font-normal">动态输入对比</h2>
            <p className="mt-4 max-w-[760px] text-[16px] leading-[1.5] text-white/70">
              同一句话，左侧传统输入法需要反复切换和选词，右侧超级输入法一次打完直接输出。
            </p>

            <div className="mt-8 flex flex-wrap gap-6">
              <div className="surface px-6 py-4 text-center">
                <p className="font-mono text-[32px] font-light text-white">93</p>
                <p className="mt-1 text-[13px] text-white/50">传统输入法按键数</p>
              </div>
              <div className="surface px-6 py-4 text-center">
                <p className="font-mono text-[32px] font-light text-white">76</p>
                <p className="mt-1 text-[13px] text-white/50">超级输入法按键数</p>
              </div>
              <div className="surface px-6 py-4 text-center">
                <p className="font-mono text-[32px] font-light text-white">-18%</p>
                <p className="mt-1 text-[13px] text-white/50">按键次数减少</p>
              </div>
              <div className="surface px-6 py-4 text-center">
                <p className="font-mono text-[32px] font-light text-white">0</p>
                <p className="mt-1 text-[13px] text-white/50">中途切换次数</p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] lg:items-stretch">
              <ReplayPanel title="系统输入法" tone="system" frames={SYSTEM_FRAMES} />
              <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-3">
                <span className="h-16 w-px bg-white/10" />
                <span className="mono-tag">VS</span>
                <span className="h-16 w-px bg-white/10" />
              </div>
              <ReplayPanel title="SUPER IME" tone="super" frames={SUPER_FRAMES} />
            </div>
          </div>
        </section>

        <section
          id="engine"
          className="section-enter border-b border-white/10"
          style={{ "--enter-index": 4 } as CSSProperties}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-[30px] leading-[1.2] font-normal">输入机制</h2>
                <p className="mt-4 max-w-[540px] text-[16px] leading-[1.5] text-white/70">
                  从逐词输入转向整句理解。输入过程保持连续，候选结果保持稳定。
                </p>
              </div>

              <div className="space-y-3">
                {ENGINE_LINES.map((line) => (
                  <article key={line.label} className="surface p-5">
                    <p className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">
                      {line.label}
                    </p>
                    <p className="mt-2 font-mono text-[20px] font-light text-white">
                      {line.value}
                    </p>
                    <p className="mt-2 text-[14px] leading-[1.5] text-white/70">
                      {line.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="download"
          className="section-enter"
          style={{ "--enter-index": 5 } as CSSProperties}

        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="surface p-8 sm:p-10">
              <div>
                <h2 className="text-[30px] leading-[1.2] font-normal">下载超级输入法</h2>
                <p className="mt-4 max-w-[640px] text-[16px] leading-[1.5] text-white/70">
                  AI 驱动的智能输入法。整句输入、中英混输、模糊容错，开箱即用。
                  目前支持 macOS，Windows 版即将推出。
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="https://pub-9e452a8e2f4e4b94ab74b337d3c7cb84.r2.dev/%E8%B6%85%E7%BA%A7%E8%BE%93%E5%85%A5%E6%B3%95-1.0.6.pkg" className="mono-button mono-button-primary">
                    DOWNLOAD FOR MACOS
                  </a>
                  <span className="mono-button mono-button-ghost" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    WINDOWS — COMING SOON
                  </span>
                </div>
                <p className="mt-4 text-[13px] text-white/40">
                  macOS 13+ (Apple Silicon &amp; Intel) &middot; 安装包约 604MB（模型文件占99%）
                </p>
                <details className="mt-4 text-[13px] text-white/40">
                  <summary className="cursor-pointer hover:text-white/60">安装提示：首次打开提示"身份不明的开发者"？</summary>
                  <div className="mt-2 space-y-1 pl-4 border-l border-white/10">
                    <p>1. 双击安装包，如果弹出安全提示，点"好"关闭</p>
                    <p>2. 打开 系统设置 → 隐私与安全性</p>
                    <p>3. 下方会显示"超级输入法-1.0.6.pkg 已被阻止"，点"仍要打开"</p>
                    <p>4. 输入密码确认，正常安装即可</p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-white/10"
        >
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <h2 className="text-[30px] leading-[1.2] font-normal">联系我们</h2>
            <p className="mt-4 max-w-[760px] text-[16px] leading-[1.5] text-white/70">
              使用中遇到问题、有功能建议，或者想参与开发，欢迎联系。
            </p>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="surface p-6">
                <p className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">Email</p>
                <a href="mailto:g03024735@gmail.com" className="mt-3 block text-[16px] text-white hover:text-white/70">
                  g03024735@gmail.com
                </a>
              </div>

              <div className="surface p-6">
                <p className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">用户交流群</p>
                <div className="mt-3 flex h-[160px] items-center justify-center border border-white/10 bg-white/[0.03]">
                  <img src="/qrcode.png" alt="扫码加群" className="h-[140px] w-[140px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class=\"font-mono text-[12px] text-white/30\">二维码待添加</span>'; }} />
                </div>
                <p className="mt-2 text-[13px] text-white/40">微信扫码加入交流群</p>
              </div>

              <div className="surface p-6">
                <p className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">GitHub</p>
                <p className="mt-3 text-[16px] text-white/50">即将开源，敬请期待</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-[12px] text-white/50 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} 超级输入法</p>
          <a href="mailto:g03024735@gmail.com" className="font-mono tracking-[1px] hover:text-white/70">g03024735@gmail.com</a>
        </div>
      </footer>
    </div>
  );
}
