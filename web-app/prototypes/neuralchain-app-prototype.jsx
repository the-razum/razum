import { useState, useEffect, useRef, useCallback } from "react";

const MODELS = [
  { id: "llama3", name: "Llama 3 70B", icon: "🦙", desc: "Универсальный чат", speed: "0.6s", tag: "Популярная" },
  { id: "mistral", name: "Mistral Large", icon: "🌬️", desc: "Быстрые ответы", speed: "0.4s", tag: "Быстрая" },
  { id: "sdxl", name: "Stable Diffusion XL", icon: "🎨", desc: "Генерация картинок", speed: "3s", tag: "Картинки" },
  { id: "whisper", name: "Whisper Large", icon: "🎤", desc: "Голос → текст", speed: "1s", tag: "Аудио" },
];

const PLANS = [
  { name: "Free", price: "0", period: "", requests: "50/день", models: "Базовые", speed: "Стандарт", features: ["50 запросов/день", "2 модели", "Обычные ноды"], cta: "Текущий план", active: true },
  { name: "Basic", price: "20", period: "/мес", requests: "2000/день", models: "Все", speed: "Быстрый", features: ["2000 запросов/день", "Все модели", "Горячие ноды", "Стриминг"], cta: "Подключить", active: false, popular: true },
  { name: "Pro", price: "50", period: "/мес", requests: "Безлимит", models: "Все + API", speed: "Приоритет", features: ["Безлимит", "API доступ", "Файнтюнинг", "Приоритетные ноды"], cta: "Подключить", active: false },
];

const SAMPLE_RESPONSES = {
  llama3: [
    "Привет! Я работаю через децентрализованную сеть NeuralChain. Мой ответ сейчас считает GPU-нода в Европе. В отличие от централизованных сервисов, здесь нет единой точки отказа — если одна нода упадёт, задачу подхватит другая.\n\nЧем могу помочь?",
    "Отличный вопрос! Декцентрализованные AI-вычисления работают по принципу распределённой сети. Вместо одного огромного дата-центра используются тысячи GPU по всему миру.\n\nКаждый владелец видеокарты может стать частью сети и зарабатывать токены NCH за выполнение AI-задач.",
    "NeuralChain использует механизм Proof-of-Useful-Compute. Это значит, что в отличие от Bitcoin, где вычисления тратятся на бессмысленное хеширование, здесь каждое вычисление — это реальная полезная работа: ответ на вопрос, генерация картинки или обучение модели.",
  ],
  mistral: [
    "Привет! Mistral здесь — быстрая и точная. Работаю через NeuralChain.\n\nГотова помочь с любыми задачами: от написания кода до анализа данных. Что нужно?",
    "Конечно! Вот краткое сравнение:\n\n• Централизованные сервисы (ChatGPT, Claude) — быстро, но дорого и зависимость от одной компании\n• NeuralChain — сопоставимая скорость, дешевле на 30-60%, никакой зависимости",
  ],
};

const FAKE_NODES = [
  { id: 1, name: "gpu-rig-moscow", gpu: "RTX 4090", region: "Москва", status: "active", tasks: 1847, rep: 982 },
  { id: 2, name: "lambda-berlin", gpu: "A100 80GB", region: "Берлин", status: "active", tasks: 5231, rep: 997 },
  { id: 3, name: "vast-tokyo-7", gpu: "RTX 3090", region: "Токио", status: "active", tasks: 923, rep: 945 },
  { id: 4, name: "home-miner-spb", gpu: "RTX 4070 Ti", region: "СПб", status: "computing", tasks: 412, rep: 891 },
  { id: 5, name: "runpod-us-east", gpu: "H100", region: "Вирджиния", status: "active", tasks: 8834, rep: 999 },
  { id: 6, name: "colossus-singapore", gpu: "A100 40GB", region: "Сингапур", status: "idle", tasks: 3102, rep: 971 },
];

function TypingEffect({ text, speed = 20, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(timer);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text]);

  return <span>{displayed}<span style={{ opacity: displayed.length < text.length ? 1 : 0, animation: "blink 1s infinite" }}>▊</span></span>;
}

export default function NeuralChainApp() {
  const [screen, setScreen] = useState("chat");
  const [model, setModel] = useState(MODELS[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [nodeForTask, setNodeForTask] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || isTyping) return;
    const userMsg = { role: "user", text: input.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const assignedNode = FAKE_NODES[Math.floor(Math.random() * FAKE_NODES.length)];
    setNodeForTask(assignedNode);

    const responses = SAMPLE_RESPONSES[model.id] || SAMPLE_RESPONSES.llama3;
    const response = responses[Math.floor(Math.random() * responses.length)];

    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: response,
        time: new Date(),
        node: assignedNode,
        model: model.name,
        latency: (delay / 1000).toFixed(1),
      }]);
    }, delay);
  }, [input, isTyping, model]);

  const navItems = [
    { id: "chat", icon: "💬", label: "Чат" },
    { id: "nodes", icon: "🖥️", label: "Сеть" },
    { id: "plans", icon: "💎", label: "Планы" },
    { id: "account", icon: "👤", label: "Профиль" },
  ];

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#0a0b0f", color: "#e0e6ed",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 480, margin: "0 auto",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "14px 16px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #1a1c24",
        background: "rgba(10,11,15,0.95)", backdropFilter: "blur(10px)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⛓️</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#34d399" }}>NeuralChain</span>
        </div>
        {screen === "chat" && (
          <button onClick={() => setShowModelPicker(!showModelPicker)} style={{
            background: "#1a1c24", border: "1px solid #2a2d38",
            borderRadius: 10, padding: "6px 12px",
            color: "#e0e6ed", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>{model.icon}</span>
            <span>{model.name.split(" ")[0]}</span>
            <span style={{ color: "#5a6270" }}>▾</span>
          </button>
        )}
      </div>

      {/* Model Picker Dropdown */}
      {showModelPicker && (
        <div style={{
          position: "absolute", top: 52, right: 12, left: 12, zIndex: 20,
          background: "#14161c", border: "1px solid #2a2d38",
          borderRadius: 14, padding: 8, animation: "fadeIn 0.2s ease",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          {MODELS.map(m => (
            <button key={m.id} onClick={() => { setModel(m); setShowModelPicker(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", border: "none", borderRadius: 10,
              background: model.id === m.id ? "#34d39915" : "transparent",
              cursor: "pointer", textAlign: "left", color: "#e0e6ed",
            }}>
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "#5a6270" }}>{m.desc}</div>
              </div>
              <div style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 6,
                background: "#34d39915", color: "#34d399",
              }}>{m.speed}</div>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>

        {/* CHAT SCREEN */}
        {screen === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
            <div style={{ flex: 1, padding: "12px 14px" }}>
              {messages.length === 0 && (
                <div style={{
                  textAlign: "center", paddingTop: 60,
                  animation: "fadeIn 0.5s ease",
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⛓️</div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#34d399", margin: "0 0 8px" }}>
                    NeuralChain AI
                  </h2>
                  <p style={{ fontSize: 13, color: "#5a6270", margin: "0 0 24px" }}>
                    Децентрализованный AI · {model.icon} {model.name}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto" }}>
                    {["Расскажи о NeuralChain", "Чем ты лучше ChatGPT?", "Как работает сеть?"].map((q, i) => (
                      <button key={i} onClick={() => { setInput(q); }} style={{
                        background: "#14161c", border: "1px solid #2a2d38",
                        borderRadius: 12, padding: "10px 14px",
                        color: "#b0b8c8", fontSize: 13, cursor: "pointer",
                        textAlign: "left", transition: "all 0.2s",
                      }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 16, animation: "fadeIn 0.3s ease",
                  display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: 16,
                    background: msg.role === "user" ? "#34d399" : "#1a1c24",
                    color: msg.role === "user" ? "#0a0b0f" : "#e0e6ed",
                    fontSize: 14, lineHeight: 1.55,
                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                    borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.role === "assistant" && i === messages.length - 1 && isTyping ? (
                      <TypingEffect text={msg.text} speed={18} onDone={() => setIsTyping(false)} />
                    ) : msg.text}
                  </div>

                  {msg.role === "assistant" && msg.node && (
                    <div style={{
                      display: "flex", gap: 8, marginTop: 4, paddingLeft: 4,
                      fontSize: 10, color: "#3a3f4a",
                    }}>
                      <span>🖥️ {msg.node.name}</span>
                      <span>·</span>
                      <span>📍 {msg.node.region}</span>
                      <span>·</span>
                      <span>⚡ {msg.latency}s</span>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{
                    display: "flex", gap: 4, padding: "8px 14px",
                    background: "#1a1c24", borderRadius: 16,
                  }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#34d399",
                        animation: `pulse 1s infinite ${j * 0.2}s`,
                      }} />
                    ))}
                  </div>
                  {nodeForTask && (
                    <span style={{ fontSize: 10, color: "#3a3f4a" }}>
                      Считает {nodeForTask.name} ({nodeForTask.gpu})
                    </span>
                  )}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 14px 12px",
              borderTop: "1px solid #1a1c24",
              background: "rgba(10,11,15,0.95)",
            }}>
              <div style={{
                display: "flex", gap: 8, alignItems: "flex-end",
              }}>
                <div style={{
                  flex: 1, background: "#14161c", border: "1px solid #2a2d38",
                  borderRadius: 22, padding: "10px 16px",
                  display: "flex", alignItems: "center",
                }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Напишите сообщение..."
                    style={{
                      flex: 1, background: "none", border: "none",
                      color: "#e0e6ed", fontSize: 14, width: "100%",
                    }}
                  />
                </div>
                <button onClick={sendMessage} disabled={!input.trim() || isTyping} style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: input.trim() && !isTyping ? "#34d399" : "#1a1c24",
                  border: "none", cursor: input.trim() && !isTyping ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, transition: "all 0.2s",
                  color: input.trim() && !isTyping ? "#0a0b0f" : "#3a3f4a",
                }}>↑</button>
              </div>
              <div style={{
                textAlign: "center", fontSize: 10, color: "#2a2d38",
                marginTop: 6,
              }}>
                Вычислено децентрализованной сетью NeuralChain · {FAKE_NODES.filter(n => n.status === "active").length} нод онлайн
              </div>
            </div>
          </div>
        )}

        {/* NODES SCREEN */}
        {screen === "nodes" && (
          <div style={{ padding: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Сеть NeuralChain</h2>
            <p style={{ fontSize: 12, color: "#5a6270", margin: "0 0 16px" }}>
              {FAKE_NODES.length} нод · {FAKE_NODES.filter(n => n.status !== "idle").length} активных
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16,
            }}>
              {[
                { label: "Всего задач", value: FAKE_NODES.reduce((s, n) => s + n.tasks, 0).toLocaleString(), color: "#34d399" },
                { label: "GPU онлайн", value: FAKE_NODES.filter(n => n.status !== "idle").length, color: "#38bdf8" },
                { label: "Ср. репутация", value: Math.round(FAKE_NODES.reduce((s, n) => s + n.rep, 0) / FAKE_NODES.length), color: "#a78bfa" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: "#14161c", border: "1px solid #1e2028",
                  borderRadius: 12, padding: "10px 12px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#5a6270", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {FAKE_NODES.map(node => (
              <div key={node.id} style={{
                background: "#14161c", border: "1px solid #1e2028",
                borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                animation: "fadeIn 0.3s ease",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: node.status === "active" ? "#34d399" : node.status === "computing" ? "#fbbf24" : "#5a6270",
                      animation: node.status === "computing" ? "pulse 1s infinite" : "none",
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{node.name}</span>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 6,
                    background: node.status === "active" ? "#34d39915" : node.status === "computing" ? "#fbbf2415" : "#5a627015",
                    color: node.status === "active" ? "#34d399" : node.status === "computing" ? "#fbbf24" : "#5a6270",
                  }}>
                    {node.status === "active" ? "Активна" : node.status === "computing" ? "Считает" : "Ожидание"}
                  </span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 11, color: "#5a6270",
                }}>
                  <span>🎮 {node.gpu}</span>
                  <span>📍 {node.region}</span>
                  <span>✅ {node.tasks}</span>
                  <span>⭐ {node.rep}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PLANS SCREEN */}
        {screen === "plans" && (
          <div style={{ padding: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Подписка</h2>
            <p style={{ fontSize: 12, color: "#5a6270", margin: "0 0 16px" }}>
              Платите картой — крипто под капотом
            </p>

            {PLANS.map((plan, i) => (
              <div key={i} style={{
                background: plan.popular ? "linear-gradient(135deg, #34d39908, #38bdf808)" : "#14161c",
                border: `1.5px solid ${plan.popular ? "#34d39940" : "#1e2028"}`,
                borderRadius: 16, padding: 18, marginBottom: 10,
                position: "relative",
              }}>
                {plan.popular && (
                  <div style={{
                    position: "absolute", top: -10, right: 16,
                    background: "linear-gradient(135deg, #34d399, #38bdf8)",
                    borderRadius: 8, padding: "3px 10px",
                    fontSize: 10, fontWeight: 700, color: "#0a0b0f",
                  }}>ПОПУЛЯРНЫЙ</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{plan.name}</span>
                  <div>
                    <span style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>${plan.price}</span>
                    <span style={{ fontSize: 12, color: "#5a6270" }}>{plan.period}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#b0b8c8" }}>
                      <span style={{ color: "#34d399", fontSize: 12 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <button style={{
                  width: "100%", padding: "10px", borderRadius: 10,
                  background: plan.active ? "#1a1c24" : plan.popular ? "#34d399" : "#1a1c24",
                  border: plan.active ? "1px solid #2a2d38" : plan.popular ? "none" : "1px solid #34d39950",
                  color: plan.active ? "#5a6270" : plan.popular ? "#0a0b0f" : "#34d399",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>{plan.cta}</button>
              </div>
            ))}

            <div style={{
              background: "#14161c", border: "1px solid #1e2028",
              borderRadius: 14, padding: 16, marginTop: 8,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fb923c", margin: "0 0 8px" }}>
                Куда уходят деньги с подписки?
              </h3>
              {[
                { label: "GPU-нодам за вычисления", pct: 60, color: "#34d399" },
                { label: "Валидаторам за проверку", pct: 10, color: "#38bdf8" },
                { label: "Развитие проекта", pct: 10, color: "#a78bfa" },
                { label: "Сжигание токенов NCH", pct: 10, color: "#fb923c" },
                { label: "Команда", pct: 10, color: "#f472b6" },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "#b0b8c8" }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "#1e2028", borderRadius: 2 }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACCOUNT SCREEN */}
        {screen === "account" && (
          <div style={{ padding: 14 }}>
            <div style={{
              textAlign: "center", padding: "24px 0 20px",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #34d399, #38bdf8)",
                margin: "0 auto 12px", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 28,
              }}>👤</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Основатель</h2>
              <p style={{ fontSize: 12, color: "#5a6270", margin: 0 }}>Free план · 47/50 запросов сегодня</p>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16,
            }}>
              {[
                { label: "Баланс NCH", value: "1,250", color: "#34d399" },
                { label: "Запросов всего", value: "847", color: "#38bdf8" },
                { label: "Сэкономлено vs AWS", value: "$124", color: "#a78bfa" },
                { label: "CO₂ сэкономлено", value: "2.1 кг", color: "#fbbf24" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: "#14161c", border: "1px solid #1e2028",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 10, color: "#5a6270", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {[
              { icon: "💎", label: "Управление подпиской", desc: "Free план" },
              { icon: "🔑", label: "API ключи", desc: "Для разработчиков" },
              { icon: "💰", label: "Кошелёк NCH", desc: "1,250 NCH" },
              { icon: "📊", label: "Статистика использования", desc: "847 запросов" },
              { icon: "⚙️", label: "Настройки", desc: "Язык, тема, уведомления" },
            ].map((item, i) => (
              <button key={i} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", background: "#14161c",
                border: "1px solid #1e2028", borderRadius: 12,
                marginBottom: 6, cursor: "pointer", textAlign: "left",
                color: "#e0e6ed",
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#5a6270" }}>{item.desc}</div>
                </div>
                <span style={{ color: "#3a3f4a" }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        display: "flex", borderTop: "1px solid #1a1c24",
        background: "rgba(10,11,15,0.98)", backdropFilter: "blur(10px)",
        padding: "6px 0 10px",
      }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setScreen(item.id); setShowModelPicker(false); }} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, border: "none",
            background: "none", cursor: "pointer", padding: "4px 0",
          }}>
            <span style={{ fontSize: 20, filter: screen === item.id ? "none" : "grayscale(1) opacity(0.4)" }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: screen === item.id ? "#34d399" : "#3a3f4a",
            }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
