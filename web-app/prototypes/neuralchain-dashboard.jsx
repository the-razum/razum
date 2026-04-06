import { useState } from "react";

const LAYERS = [
  {
    id: "apps",
    title: "Слой 4: Приложения",
    color: "#a78bfa",
    colorDark: "#7c3aed",
    icon: "🧩",
    components: ["AI Marketplace", "API Gateway", "Python/JS SDK", "Кошелёк NCH"],
    description:
      "Пользовательский уровень. Разработчики отправляют задачи через SDK, конечные пользователи взаимодействуют через маркетплейс моделей. Единый API абстрагирует всю сложность нижних слоёв.",
    analogy: "Аналог в Ethereum: dApps, MetaMask, Uniswap",
  },
  {
    id: "coord",
    title: "Слой 3: Координация",
    color: "#38bdf8",
    colorDark: "#0284c7",
    icon: "🔀",
    components: ["Task Scheduler", "Матчинг нод", "Система репутации", "Очередь задач"],
    description:
      "Мозг сети. Принимает задачу, оценивает требования (VRAM, compute units), подбирает оптимальные ноды по мощности, латентности и репутации. Разбивает большие задачи на подзадачи для distributed training.",
    analogy: "Аналог: Kubernetes для AI, но децентрализованный",
  },
  {
    id: "verify",
    title: "Слой 2: Верификация (PoUC)",
    color: "#34d399",
    colorDark: "#059669",
    icon: "🛡️",
    components: ["Redundant Execution", "Gradient Checkpointing", "Challenge-Response", "Слэшинг"],
    description:
      "Ключевое отличие от конкурентов. Три метода проверки: дублирование для инференса (3 ноды считают одно и то же), контрольные точки для тренировки, и challenge-ответ для сложных задач. Неверные результаты → потеря стейка.",
    analogy: "Аналог: Proof-of-Work Bitcoin, но вместо хешей — реальные AI-задачи",
  },
  {
    id: "base",
    title: "Слой 1: Блокчейн + Вычисления",
    color: "#fb923c",
    colorDark: "#ea580c",
    icon: "⛓️",
    components: ["Консенсус PoUC", "GPU-ноды", "Стейкинг NCH", "Распределённое хранилище"],
    description:
      "Фундамент. Блокчейн фиксирует все транзакции, стейки и результаты задач. GPU-ноды выполняют реальные вычисления. Стейкинг обеспечивает экономическую безопасность сети.",
    analogy: "Аналог: Bitcoin L1, но ноды — это GPU-серверы, а не ASIC-майнеры",
  },
];

const ROADMAP = [
  {
    phase: "Фаза 0",
    title: "Фундамент",
    time: "Мес. 1–6",
    items: ["White paper", "Core-команда", "PoC на 5–10 нод", "Прототип PoUC"],
    status: "current",
  },
  {
    phase: "Фаза 1",
    title: "Testnet",
    time: "Мес. 7–12",
    items: ["Тестнет (инференс)", "Task Scheduler", "Python SDK", "Ранние майнеры"],
    status: "future",
  },
  {
    phase: "Фаза 2",
    title: "Mainnet v1",
    time: "Мес. 13–18",
    items: ["Мейннет запуск", "Продажа токенов", "AI Marketplace v1", "Bug bounty"],
    status: "future",
  },
  {
    phase: "Фаза 3",
    title: "Full Launch",
    time: "Мес. 19–30",
    items: ["Distributed training", "Файнтюнинг", "TEE шифрование", "DAO governance"],
    status: "future",
  },
];

const TOKEN_DIST = [
  { label: "Вычислительные награды", pct: 50, color: "#34d399" },
  { label: "Команда", pct: 15, color: "#a78bfa" },
  { label: "Экосистемный фонд", pct: 15, color: "#38bdf8" },
  { label: "Ранние инвесторы", pct: 10, color: "#fb923c" },
  { label: "Публичная продажа", pct: 5, color: "#f472b6" },
  { label: "Ликвидность", pct: 5, color: "#fbbf24" },
];

const NEXT_STEPS = [
  { week: "Нед. 1–2", task: "Изучить Bittensor, Render, Akash. Найти со-основателей.", icon: "🔍" },
  { week: "Нед. 3–4", task: "Техническая спецификация PoUC. PoC: 3 ноды + Llama инференс.", icon: "⚙️" },
  { week: "Мес. 2–3", task: "Тестнет 10–20 нод. Python SDK. Документация.", icon: "🚀" },
  { week: "Мес. 4–6", task: "Сообщество. Гранты. Конференции. Привлечение инвестиций.", icon: "🌍" },
];

function LayerCard({ layer, isOpen, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isOpen
          ? `linear-gradient(135deg, ${layer.color}18, ${layer.colorDark}10)`
          : "#111318",
        border: `1.5px solid ${isOpen ? layer.color + "60" : "#1e2028"}`,
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
        transform: isOpen ? "scale(1.01)" : "scale(1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isOpen ? 14 : 0 }}>
        <span style={{ fontSize: 22 }}>{layer.icon}</span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontWeight: 700, fontSize: 15, color: layer.color,
        }}>{layer.title}</span>
      </div>

      {isOpen && (
        <div style={{ animation: "fadeSlide 0.3s ease" }}>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12,
          }}>
            {layer.components.map((c, i) => (
              <span key={i} style={{
                background: layer.color + "15",
                border: `1px solid ${layer.color}30`,
                borderRadius: 8, padding: "4px 10px",
                fontSize: 12, color: layer.color,
                fontFamily: "'Courier New', monospace",
              }}>{c}</span>
            ))}
          </div>
          <p style={{
            fontSize: 13, lineHeight: 1.6, color: "#b0b8c8", margin: "0 0 10px",
          }}>{layer.description}</p>
          <p style={{
            fontSize: 11, color: "#5a6270",
            fontStyle: "italic", margin: 0,
          }}>{layer.analogy}</p>
        </div>
      )}
    </div>
  );
}

export default function NeuralChainDashboard() {
  const [activeLayer, setActiveLayer] = useState("verify");
  const [activeTab, setActiveTab] = useState("arch");

  const tabs = [
    { id: "arch", label: "Архитектура" },
    { id: "token", label: "Токеномика" },
    { id: "road", label: "Дорожная карта" },
    { id: "next", label: "Что делать" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0b0f",
      color: "#e0e6ed",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "20px 16px",
    }}>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, #34d39920, #38bdf820)",
          border: "1px solid #34d39930",
          borderRadius: 12, padding: "6px 16px", marginBottom: 12,
        }}>
          <span style={{ fontSize: 20 }}>⛓️</span>
          <span style={{
            fontFamily: "'Courier New', monospace",
            fontWeight: 700, fontSize: 11, color: "#34d399",
            letterSpacing: 3, textTransform: "uppercase",
          }}>NeuralChain</span>
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, margin: "0 0 6px",
          background: "linear-gradient(135deg, #34d399, #38bdf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Децентрализованная сеть AI-вычислений</h1>
        <p style={{ fontSize: 13, color: "#5a6270", margin: 0 }}>
          Proof-of-Useful-Compute · Инференс + Тренировка · Открытый AI
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: "#111318", borderRadius: 12, padding: 4,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "10px 0",
              background: activeTab === t.id
                ? "linear-gradient(135deg, #34d39920, #38bdf820)"
                : "transparent",
              border: activeTab === t.id ? "1px solid #34d39940" : "1px solid transparent",
              borderRadius: 10,
              color: activeTab === t.id ? "#34d399" : "#5a6270",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Architecture Tab */}
      {activeTab === "arch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: "#5a6270", margin: "0 0 8px", textAlign: "center" }}>
            Нажми на слой, чтобы раскрыть детали
          </p>
          {LAYERS.map(l => (
            <LayerCard
              key={l.id}
              layer={l}
              isOpen={activeLayer === l.id}
              onClick={() => setActiveLayer(activeLayer === l.id ? null : l.id)}
            />
          ))}

          <div style={{
            marginTop: 16, background: "#111318",
            border: "1px solid #1e2028", borderRadius: 14,
            padding: 16,
          }}>
            <h3 style={{
              fontSize: 13, fontWeight: 700, color: "#38bdf8",
              margin: "0 0 12px", fontFamily: "'Courier New', monospace",
            }}>Поток задачи в сети</h3>
            {[
              { step: "1", text: "Пользователь отправляет задачу через SDK", color: "#a78bfa" },
              { step: "2", text: "Планировщик подбирает 3 GPU-ноды", color: "#38bdf8" },
              { step: "3", text: "Ноды выполняют вычисления параллельно", color: "#fb923c" },
              { step: "4", text: "Результаты верифицируются (2 из 3 совпадают)", color: "#34d399" },
              { step: "5", text: "Результат → пользователю, награда → нодам", color: "#f472b6" },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0",
                borderBottom: i < 4 ? "1px solid #1a1c24" : "none",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: s.color + "20", border: `1.5px solid ${s.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: s.color,
                  flexShrink: 0,
                }}>{s.step}</div>
                <span style={{ fontSize: 13, color: "#b0b8c8" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tokenomics Tab */}
      {activeTab === "token" && (
        <div>
          <div style={{
            background: "#111318", border: "1px solid #1e2028",
            borderRadius: 14, padding: 18, marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#5a6270", marginBottom: 4 }}>Тикер</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>$NCH</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#5a6270", marginBottom: 4 }}>Общее предложение</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e0e6ed" }}>1 000 000 000</div>
              </div>
            </div>

            <div style={{
              display: "flex", height: 18, borderRadius: 10, overflow: "hidden", marginBottom: 16,
            }}>
              {TOKEN_DIST.map((t, i) => (
                <div key={i} style={{
                  width: `${t.pct}%`, background: t.color,
                  opacity: 0.8, transition: "opacity 0.2s",
                }} title={`${t.label}: ${t.pct}%`} />
              ))}
            </div>

            {TOKEN_DIST.map((t, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "6px 0",
                borderBottom: i < TOKEN_DIST.length - 1 ? "1px solid #1a1c24" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 3, background: t.color,
                  }} />
                  <span style={{ fontSize: 13, color: "#b0b8c8" }}>{t.label}</span>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: t.color,
                  fontFamily: "'Courier New', monospace",
                }}>{t.pct}%</span>
              </div>
            ))}
          </div>

          <div style={{
            background: "#111318", border: "1px solid #1e2028",
            borderRadius: 14, padding: 16,
          }}>
            <h3 style={{
              fontSize: 13, fontWeight: 700, color: "#fb923c",
              margin: "0 0 12px", fontFamily: "'Courier New', monospace",
            }}>Как NCH обретает ценность</h3>
            {[
              { icon: "💰", title: "Utility-спрос", desc: "Оплата AI-задач только в NCH" },
              { icon: "🔒", title: "Стейкинг", desc: "Ноды блокируют NCH для участия" },
              { icon: "🔥", title: "Fee Burn", desc: "20% каждой комиссии сжигается" },
              { icon: "📉", title: "Halving", desc: "Награды ÷2 каждые 4 года" },
            ].map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: i < 3 ? "1px solid #1a1c24" : "none",
              }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e6ed" }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "#5a6270" }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap Tab */}
      {activeTab === "road" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROADMAP.map((r, i) => (
            <div key={i} style={{
              background: r.status === "current"
                ? "linear-gradient(135deg, #34d39910, #38bdf810)"
                : "#111318",
              border: `1.5px solid ${r.status === "current" ? "#34d39940" : "#1e2028"}`,
              borderRadius: 14, padding: 16,
              position: "relative", overflow: "hidden",
            }}>
              {r.status === "current" && (
                <div style={{
                  position: "absolute", top: 10, right: 12,
                  background: "#34d39920", border: "1px solid #34d39940",
                  borderRadius: 8, padding: "2px 8px",
                  fontSize: 10, color: "#34d399", fontWeight: 600,
                  animation: "pulse 2s infinite",
                }}>ТЫ ЗДЕСЬ</div>
              )}
              <div style={{
                fontSize: 11, color: "#5a6270",
                fontFamily: "'Courier New', monospace", marginBottom: 4,
              }}>{r.phase} · {r.time}</div>
              <div style={{
                fontSize: 17, fontWeight: 700,
                color: r.status === "current" ? "#34d399" : "#6b7280",
                marginBottom: 10,
              }}>{r.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {r.items.map((item, j) => (
                  <div key={j} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, color: r.status === "current" ? "#b0b8c8" : "#4a5060",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: r.status === "current" ? "#34d399" : "#2a2d38",
                    }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Steps Tab */}
      {activeTab === "next" && (
        <div>
          <div style={{
            background: "linear-gradient(135deg, #34d39910, #a78bfa10)",
            border: "1px solid #34d39930",
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, color: "#34d399", margin: "0 0 6px",
            }}>Аналогия с Бутерином</h3>
            <p style={{ fontSize: 13, color: "#b0b8c8", lineHeight: 1.6, margin: 0 }}>
              Виталик начал с white paper в 2013, собрал команду в 2014, запустил мейннет в 2015.
              Два года от идеи до рабочей сети. Твой план может быть быстрее — сейчас есть
              готовые инструменты (Cosmos SDK, Substrate), open-source модели и сформированный рынок.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NEXT_STEPS.map((s, i) => (
              <div key={i} style={{
                background: "#111318",
                border: "1px solid #1e2028",
                borderRadius: 14, padding: 16,
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "#1a1c24", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>{s.icon}</div>
                <div>
                  <div style={{
                    fontSize: 11, color: "#38bdf8", fontWeight: 600,
                    fontFamily: "'Courier New', monospace", marginBottom: 4,
                  }}>{s.week}</div>
                  <div style={{ fontSize: 13, color: "#b0b8c8", lineHeight: 1.5 }}>{s.task}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, background: "#111318",
            border: "1px solid #fb923c30",
            borderRadius: 14, padding: 16,
          }}>
            <h3 style={{
              fontSize: 13, fontWeight: 700, color: "#fb923c",
              margin: "0 0 10px", fontFamily: "'Courier New', monospace",
            }}>Технический стек для старта</h3>
            {[
              { label: "Блокчейн", value: "Cosmos SDK (Go) или Substrate (Rust)" },
              { label: "GPU compute", value: "NVIDIA CUDA + Python (PyTorch)" },
              { label: "Нетворкинг", value: "libp2p (peer-to-peer)" },
              { label: "Хранилище", value: "IPFS / Filecoin для моделей" },
              { label: "SDK", value: "Python (первый), потом JS, Rust" },
              { label: "Фронтенд", value: "React + Web3 кошелёк" },
            ].map((s, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: i < 5 ? "1px solid #1a1c24" : "none",
                fontSize: 12,
              }}>
                <span style={{ color: "#5a6270" }}>{s.label}</span>
                <span style={{ color: "#e0e6ed", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
