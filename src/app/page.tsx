"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

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
    title: "整句推理",
    description: "240M Transformer 端到端解码，输入越长上下文越丰富，结果越准确。不是查词典，是理解你在说什么。",
  },
  {
    title: "中英数混打",
    description: "一口气打完 \"jintian3dianmeeting\" 直接出 \"今天3点meeting\"。不用切换输入法，不打断思路。",
  },
  {
    title: "打错也对",
    description: "\"zhomu\" 出 \"周末\"，\"nv\" 出 \"女\"，\"lnag\" 出 \"狼\"。模糊音、缩写、手滑全兜底。",
  },
  {
    title: "越打越准",
    description: "打 \"genshui\" 先出 \"跟谁\"，继续打 \"genshuizheta\" 自动修正为 \"跟随着他\"。模型实时根据后文纠正前文。",
  },
  {
    title: "自定义词库",
    description: "添加专有名词后，模型推理时自动注入上下文。不是简单匹配，是让模型理解你的词汇。",
  },
  {
    title: "完全离线",
    description: "模型运行在本地，不联网、不上传、不追踪。你的每一次输入都只属于你自己。",
  },
];

const ENGINE_LINES = [
  {
    label: "Model",
    value: "Seq2Seq Transformer 240M",
    detail: "6层 Encoder + 6层 Decoder，d=1024，16头注意力。拼音字符序列直接映射到中文字符序列。",
  },
  {
    label: "Decoding",
    value: "Beam Search + KV Cache",
    detail: "beam=2 实时预览，展开时 beam=7~20 搜索更多候选。KV Cache 避免重复计算，每步只需一次 decoder 调用。",
  },
  {
    label: "Runtime",
    value: "CoreML Float16 on Device",
    detail: "模型运行在 Apple Neural Engine / GPU 上，Float16 推理，无需网络连接。",
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

function TryPanel() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  function doInfer(pinyin: string) {
    if (!pinyin.trim()) {
      setResult("");
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
          typeof data.text === "string"
            ? data.text
            : typeof data.result === "string"
              ? data.result
              : Array.isArray(data.candidates) && data.candidates.length > 0
                ? typeof data.candidates[0] === "string"
                  ? data.candidates[0]
                  : data.candidates[0]?.text ?? ""
                : "";
        setResult(text || "未识别到结果");
        setDurationMs(elapsed);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "请求失败");
        setResult("");
        setDurationMs(null);
      })
      .finally(() => setLoading(false));
  }

  function handleInput(value: string) {
    setInput(value);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    debounceRef[0] = setTimeout(() => doInfer(value), 300);
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <div>
        <label className="block text-[14px] text-white/60 mb-2">输入拼音</label>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="试试输入拼音，如 nihaoshijie"
          className="h-12 w-full border border-white/20 bg-white/[0.03] px-4 text-[16px] outline-none placeholder:text-white/30"
        />
      </div>

      <div className="surface p-5" style={{ minHeight: 160 }}>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <span className="font-mono text-[12px] uppercase tracking-[1px] text-white/50">
            Output
          </span>
          {durationMs !== null && (
            <span className="font-mono text-[12px] text-white/40">
              {durationMs}ms
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-[16px] text-white/40">推理中...</p>
        ) : error ? (
          <p className="text-[16px] text-red-400/80">{error}</p>
        ) : result ? (
          <p className="text-[20px] leading-[1.6] text-white whitespace-pre-wrap">{result}</p>
        ) : (
          <p className="text-[16px] text-white/30">输入拼音后，模型输出会实时显示在这里</p>
        )}
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
            <img src="/icon.svg" alt="SUPER IME" className="h-6 w-6" />
            SUPER IME
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
            <span className="mono-tag">AI-POWERED INPUT METHOD</span>
            <h1 className="mt-8 font-mono text-[clamp(3.5rem,15vw,13rem)] leading-[0.9] font-light">
              超级输入法
            </h1>
            <p className="mt-8 max-w-[760px] text-[16px] leading-[1.5] text-white/70 sm:text-[18px]">
              基于 240M Transformer 模型，整句理解替代逐字选词。
              支持中英混输、智能标点、模糊音容错，让中文输入更接近思考速度。
            </p>
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
              输入拼音，实时感受 240M 模型的推理效果。输入越长，结果越准确。
            </p>
            <TryPanel />
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
              恢复输入回放动画：左侧模拟传统逐段选词流程，右侧展示 SUPER IME
              的长串连续输入。
            </p>

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
                  基于 240M 参数 Transformer 模型，整句理解、中英混输、模糊音容错。
                  目前支持 macOS，Windows 版即将推出。
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="/SuperIME.pkg" className="mono-button mono-button-primary">
                    DOWNLOAD FOR MACOS
                  </a>
                </div>
                <p className="mt-4 text-[13px] text-white/40">
                  支持 macOS 13+ (Apple Silicon &amp; Intel) &middot; 安装包约 604MB
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-[12px] text-white/50 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} 超级输入法</p>
          <p className="font-mono uppercase tracking-[1px]">Powered by Transformer 240M</p>
        </div>
      </footer>
    </div>
  );
}
