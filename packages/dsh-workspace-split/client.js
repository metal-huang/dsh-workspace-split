window.__ModuleLoader__.load({
  id: '@local/dsh-workspace-split',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useSyncExternalStore, useRef } = React;

    // ---------- limits (PRD: 20 global default, 12 per-window hard default; both configurable) ----------
    const DEFAULT_MAX_CELLS = 20;
    const DEFAULT_MAX_PER_WINDOW = 12;

    // ---------- localStorage persistence ----------
    const LS_KEY = 'dsws-layout';
    function loadLayout() {
      try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    function saveLayout(gridSize, cells, inSplit) {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ gridSize, cells, inSplit })); } catch {}
    }

    // ---------- toggle button ----------
    // variant "sidebar": compact icon button for the sidebar footer row.
    // variant "inline": labelled button for hero / session header rows.
    function SplitButton(props) {
      const variant = props?.variant ?? 'inline';
      if (variant === 'sidebar') {
        return h('button', {
          title: '切换分屏视图',
          'aria-label': '切换分屏视图',
          style: {
            width: 28, height: 28, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 'var(--dsw-radius-sm, 6px)',
            background: 'transparent', cursor: 'pointer', padding: 0,
            color: 'var(--dsw-alias-label-secondary, #888)',
            fontSize: 15, lineHeight: 1,
          },
          onClick: () => { try { window.__dswsToggle?.(); } catch (_e) {} },
        }, '⊞');
      }
      return h('button', {
        title: '切换分屏视图',
        style: {
          padding: '4px 10px', fontSize: 12,
          border: '1px solid var(--dsw-alias-border-l3, #444)',
          borderRadius: 6, background: 'transparent',
          color: 'var(--dsw-alias-label-primary, inherit)', cursor: 'pointer',
        },
        onClick: () => { try { window.__dswsToggle?.(); } catch (_e) {} },
      }, '⊞ 分屏');
    }

    // ---------- single cell: live session events + input ----------
    function CellView(props) {
      const { sessions, sessionId } = props;
      const [binding, setBinding] = useState(null);
      const [error, setError] = useState(null);
      const [inputText, setInputText] = useState('');
      const [sending, setSending] = useState(false);
      const refRef = useRef(null);
      const bodyRef = useRef(null);
      const textareaRef = useRef(null);

      // Wait until the session appears in the host catalog before retaining.
      const catalogSubscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions]);
      const catalogSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions]);
      const catalog = useSyncExternalStore(catalogSubscribe, catalogSnapshot);
      const cataloged = !!sessionId && !!catalog?.ids?.includes(sessionId);

      // Retain session once catalogued.
      useEffect(() => {
        if (!sessionId || !cataloged) { if (!sessionId) { setBinding(null); setError(null); } return; }
        let cancelled = false;
        let reference = null;
        try {
          reference = sessions.retain(sessionId, { source: 'controllerOperation' });
          refRef.current = reference;
          reference.ready.then((b) => { if (!cancelled) setBinding(b); })
            .catch((e) => { if (!cancelled) setError(String(e)); });
        } catch (e) { setError(String(e)); }
        return () => {
          cancelled = true;
          try { refRef.current?.release(); } catch {}
          refRef.current = null;
          setBinding(null);
        };
      }, [sessionId, cataloged, sessions]);

      // Subscribe to event source.
      const [events, setEvents] = useState([]);
      useEffect(() => {
        if (!binding?.eventSource) return;
        const es = binding.eventSource;
        const update = () => { const w = es.getSnapshot(); setEvents(w?.entries ?? []); };
        update();
        return es.subscribe(update);
      }, [binding]);

      // Subscribe to session snapshot for running state.
      const [running, setRunning] = useState(false);
      useEffect(() => {
        if (!binding?.session) return;
        const sess = binding.session;
        const update = () => { const s = sess.getSnapshot(); setRunning(s?.running ?? false); };
        update();
        return sess.subscribe(update);
      }, [binding]);

      // Auto-scroll.
      useEffect(() => {
        const el = bodyRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [events.length]);

      // Send prompt.
      const send = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !binding?.session || sending) return;
        setSending(true);
        try {
          await binding.session.prompt([{ type: 'text', text }], 'queue');
          setInputText('');
        } catch (_e) {}
        setSending(false);
        textareaRef.current?.focus();
      }, [inputText, binding, sending]);

      const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      };

      if (!sessionId) return h('div', { style: { textAlign: 'center', marginTop: 40, color: 'var(--dsw-alias-label-caption, #999)', flex: 1 } }, '从上方选择会话');
      if (error) return h('div', { style: { padding: 12, color: 'var(--dsw-alias-state-error, #e00)', flex: 1 } }, `加载失败: ${error}`);
      if (!cataloged) return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '等待会话目录…');
      if (!binding) return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '加载中…');


      const visible = events.slice(-80);
      return h(React.Fragment, null,
        // messages area
        h('div', { ref: bodyRef, style: { flex: 1, overflow: 'auto', padding: 8, fontSize: 12, lineHeight: 1.5, minHeight: 0 } },
          visible.map((entry, idx) => {
            const ev = entry.event;
            const type = ev?.type ?? 'unknown';
            let text = '';
            let kind = 'other';
            if (type === 'user/message') {
              const blocks = ev?.data?.content ?? [];
              text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
              kind = 'user';
            } else if (type === 'assistant/message') {
              const blocks = ev?.data?.message?.content ?? [];
              text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
              kind = 'assistant';
            } else if (type === 'assistant/live-chunk') {
              text = ev?.data?.chunk?.text ?? '';
              kind = 'assistant';
            } else if (type === 'tool/result') {
              text = `[tool] ${ev?.data?.name ?? ''}`;
              kind = 'tool';
            } else if (type === 'turn/start') {
              text = `— 第 ${ev?.data?.turn} 轮 —`;
              kind = 'divider';
            } else { return null; }
            if (!text) return null;
            return h('div', { key: idx, style: eventStyle(kind) }, text);
          }),
        ),
        // composer
        h('div', { style: composerWrapStyle },
          h('textarea', {
            ref: textareaRef,
            value: inputText,
            onChange: (e) => setInputText(e.target.value),
            onKeyDown,
            placeholder: '输入消息…',
            rows: 1,
            style: composerInputStyle,
          }),
          h('button', {
            onClick: send,
            disabled: !inputText.trim() || sending,
            style: { ...composerBtnStyle, opacity: (!inputText.trim() || sending) ? 0.4 : 1 },
          }, '发送'),
        ),
      );
    }

    const composerWrapStyle = {
      display: 'flex', gap: 6, padding: '6px 8px',
      borderTop: '1px solid var(--dsw-alias-border-l3, #444)',
      flexShrink: 0, alignItems: 'flex-end',
    };
    const composerInputStyle = {
      flex: 1, resize: 'none', fontSize: 12, padding: '4px 8px',
      border: '1px solid var(--dsw-alias-border-l3, #444)',
      borderRadius: 4, background: 'var(--dsw-alias-bg-base, transparent)',
      color: 'var(--dsw-alias-label-primary, inherit)',
      fontFamily: 'inherit', outline: 'none',
      minHeight: 28, maxHeight: 80,
    };
    const composerBtnStyle = {
      padding: '4px 10px', fontSize: 12, cursor: 'pointer',
      border: '1px solid var(--dsw-alias-border-l3, #444)',
      borderRadius: 4, background: 'var(--dsw-alias-bg-elevated, #2a2a2a)',
      color: 'var(--dsw-alias-label-primary, inherit)',
      flexShrink: 0,
    };

    function eventStyle(kind) {
      const base = {
        padding: '6px 10px', marginBottom: 6, borderRadius: 8,
        wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.55,
        maxWidth: '88%',
      };
      if (kind === 'user') return {
        ...base, marginLeft: 'auto', marginRight: 0,
        background: 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)',
        color: 'var(--dsw-alias-label-primary, #eee)',
        borderBottomRightRadius: 2,
      };
      if (kind === 'assistant') return {
        ...base, marginRight: 'auto', marginLeft: 0,
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary, #eee)',
        border: '1px solid var(--dsw-alias-border-l3, #3a3a3a)',
        borderBottomLeftRadius: 2,
      };
      if (kind === 'tool') return {
        ...base, color: 'var(--dsw-alias-label-secondary, #888)',
        fontStyle: 'italic', fontSize: 12, fontFamily: 'var(--ds-font-family-code, monospace)',
      };
      if (kind === 'divider') return {
        ...base, maxWidth: '100%', textAlign: 'center',
        color: 'var(--dsw-alias-label-caption, #999)', fontSize: 11,
        background: 'transparent', border: 'none', padding: '2px 0',
      };
      return base;
    }

    // ---------- split grid panel ----------
    function SplitMain(props) {
      const sessions = props.__sessions;
      const subscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions]);
      const getSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions]);
      const list = useSyncExternalStore(subscribe, getSnapshot);

      const saved = useRef(loadLayout()).current;
      const [gridSize, setGridSize] = useState(saved?.gridSize ?? 2);
      const [activeCell, setActiveCell] = useState(0);
      const [cells, setCells] = useState(() => {
        const s = saved?.cells ?? [];
        const size = (saved?.gridSize ?? 2) ** 2;
        const arr = Array(size).fill(null);
        for (let i = 0; i < Math.min(s.length, size); i++) arr[i] = s[i] ?? null;
        return arr;
      });

      const items = list?.ids?.map((id) => list.byId[id]).filter(Boolean) ?? [];
      const nonBlank = items.filter((s) => !s.blank);

      // Track running state per session for status dots.
      const runningMap = useRef({});
      const [, forceUpdate] = useState(0);
      useEffect(() => {
        const unsubs = [];
        for (const s of nonBlank) {
          try {
            const info = sessions.retainInfo(s.id);
            const unsub = info.subscribe(() => {
              const snap = info.getSnapshot();
              const wasRunning = runningMap.current[s.id];
              const nowRunning = (snap?.retainedBy?.mainView ?? 0) > 0;
              if (wasRunning !== nowRunning) {
                runningMap.current[s.id] = nowRunning;
                forceUpdate((n) => n + 1);
              }
            });
            unsubs.push(unsub);
          } catch {}
        }
        return () => unsubs.forEach((u) => { try { u(); } catch {} });
      }, [nonBlank.length]);

      // Cell count is clamped to the global limit (default 20, configurable via Config).
      const maxCells = props.__maxCells ?? DEFAULT_MAX_CELLS;
      const total = Math.min(gridSize * gridSize, maxCells);

      const setCell = (idx, sessionId) => {
        setCells((prev) => { const next = [...prev]; next[idx] = sessionId; return next; });
      };

      useEffect(() => {
        const size = Math.min(gridSize * gridSize, maxCells);
        setCells((prev) => {
          const next = Array(size).fill(null);
          for (let i = 0; i < Math.min(prev.length, size); i++) next[i] = prev[i];
          return next;
        });
      }, [gridSize, maxCells]);

      useEffect(() => { saveLayout(gridSize, cells, window.__dswsInSplit ?? false); }, [gridSize, cells]);

      // Drop stale references: cells pointing at sessions no longer in the catalog.
      useEffect(() => {
        if (list?.phase !== 'ready') return;
        const known = new Set(list.ids ?? []);
        setCells((prev) => {
          if (prev.every((c) => c === null || known.has(c))) return prev;
          return prev.map((c) => (c !== null && known.has(c) ? c : null));
        });
      }, [list]);

      const cellStyle = {
        border: '1px solid var(--dsw-alias-border-l3, #444)',
        borderRadius: 8, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 0,
        background: 'var(--dsw-alias-bg-base, transparent)',
      };
      const cellHeaderStyle = {
        padding: '6px 12px', fontSize: 13, fontWeight: 500,
        borderBottom: '1px solid var(--dsw-alias-border-l3, #444)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        color: 'var(--dsw-alias-label-primary, inherit)',
      };
      const selectStyle = {
        fontSize: 12, padding: '2px 6px', maxWidth: 160,
        background: 'var(--dsw-alias-bg-base, transparent)',
        color: 'var(--dsw-alias-label-primary, inherit)',
        border: '1px solid var(--dsw-alias-border-l3, #444)',
        borderRadius: 4,
      };
      const dotStyle = (running) => ({
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: running ? 'var(--dsw-alias-state-success, #4caf50)' : 'var(--dsw-alias-label-caption, #999)',
        transition: 'background 0.3s',
      });
      const toolbarStyle = {
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', flexShrink: 0,
        borderBottom: '1px solid var(--dsw-alias-border-l3, #444)',
        color: 'var(--dsw-alias-label-primary, inherit)',
      };
      const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        gap: 8, padding: 12,
        flex: 1, minHeight: 0, overflow: 'auto',
      };
      const btnStyle = {
        padding: '2px 8px', fontSize: 12, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l3, #444)',
        borderRadius: 4, background: 'transparent',
        color: 'var(--dsw-alias-label-primary, inherit)',
      };

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' } },
        h('div', { style: toolbarStyle },
          h('span', { style: { fontWeight: 600, fontSize: 15 } }, '分屏视图'),
          h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
            `${nonBlank.length} 个会话 · ${total}/${maxCells} 格`),
          h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' } },
            h('span', { style: { fontSize: 12 } }, '网格:'),
            [1, 2, 3, 4, 5].map((n) =>
              h('button', {
                key: n, style: { ...btnStyle, fontWeight: gridSize === n ? 700 : 400 },
                onClick: () => setGridSize(n),
                title: `${n}×${n} = ${n * n} 格`,
              }, `${n}×${n}`)
            ),
            h('button', {
              style: btnStyle,
              onClick: () => { try { window.__dswsToggle?.(); } catch (_e) {} },
            }, '退出分屏'),
          ),
        ),
        h('div', { style: gridStyle },
          Array.from({ length: total }, (_, i) => {
            const sid = cells[i];
            const sess = sid ? nonBlank.find((s) => s.id === sid) : null;
            const isActive = i === activeCell;
            return h('div', {
              key: i,
              style: {
                ...cellStyle,
                borderColor: isActive ? 'var(--dsw-alias-state-business-primary, #4a9eff)' : 'var(--dsw-alias-border-l3, #444)',
                borderWidth: isActive ? 2 : 1,
              },
              onMouseDown: () => setActiveCell(i),
            },
              h('div', {
                style: {
                  ...cellHeaderStyle,
                  background: isActive ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)' : 'transparent',
                },
              },
                sess
                  ? h(React.Fragment, null,
                      h('span', { style: dotStyle(sess.running) }),
                      h('span', null, sess.displayTitle || sess.title || sess.id.slice(0, 8)),
                    )
                  : h('span', { style: { color: 'var(--dsw-alias-label-caption, #999)' } }, `格 ${i + 1}`),
                h('select', {
                  style: { ...selectStyle, marginLeft: 'auto' },
                  value: sid ?? '',
                  onChange: (e) => setCell(i, e.target.value || null),
                },
                  h('option', { value: '' }, '选择会话…'),
                  nonBlank.map((s) =>
                    h('option', { key: s.id, value: s.id },
                      (s.displayTitle || s.title || s.id.slice(0, 8)) + (s.running ? ' ●' : ''))
                  ),
                ),
              ),
              h(CellView, { sessions, sessionId: sid }),
            );
          }),
        ),
      );
    }

    return {
      inject: ['slots', 'layout', 'sessions'],
      // Config: cell limits. Users override in cordis.patch.yml.
      apply(ctx, config) {
        const maxCells = config?.maxCells ?? DEFAULT_MAX_CELLS;
        // Restore split state from previous session.
        const saved = loadLayout();
        let inSplit = saved?.inSplit ?? false;
        window.__dswsInSplit = inSplit;

        window.__dswsToggle = () => {
          inSplit = !inSplit;
          window.__dswsInSplit = inSplit;
          try { ctx.layout.selectPanel(inSplit ? 'split' : null); } catch (_e) {}
          // Persist immediately on toggle.
          const cur = loadLayout() ?? {};
          saveLayout(cur.gridSize ?? 2, cur.cells ?? [], inSplit);
        };
        ctx.effect(() => () => { try { delete window.__dswsToggle; delete window.__dswsInSplit; } catch (_e) {} }, 'workspace-split: cleanup');

        // Primary entry: sidebar footer row, beside the account menu.
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action', id: 'workspace-split-sidebar', order: 5,
        }, function SidebarSplitButton() {
          return h(SplitButton, { variant: 'sidebar' });
        }));

        ctx.slots.inject('conversation.hero.options', () => ctx.slots.register({
          name: 'conversation.hero.options', id: 'workspace-split-btn-hero', order: 5,
        }, SplitButton));

        ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions', id: 'workspace-split-btn', order: 5,
        }, SplitButton));

        const sessionsRef = ctx.sessions;
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: 'split',
        }, function SplitPanel() {
          return h(SplitMain, { __sessions: sessionsRef, __maxCells: maxCells });
        }));

        // Auto-enter split after the panel is registered.
        if (inSplit) {
          try { ctx.layout.selectPanel('split'); } catch (_e) {}
        }
      },
    };
  },
});
