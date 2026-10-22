window.__ModuleLoader__.load({
  id: '@local/dsh-workspace-split',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useSyncExternalStore, useRef } = React;

    // ---------- localStorage persistence ----------
    const LS_KEY = 'dsws-layout';
    function loadLayout() {
      try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    function saveLayout(gridSize, cells) {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ gridSize, cells })); } catch {}
    }

    // ---------- the toggle button ----------
    function SplitButton() {
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

    // ---------- single cell: renders session events live ----------
    function CellView(props) {
      const { sessions, sessionId } = props;
      const [binding, setBinding] = useState(null);
      const [error, setError] = useState(null);
      const refRef = useRef(null);
      const bodyRef = useRef(null);

      // Retain the session and subscribe to its event window.
      useEffect(() => {
        if (!sessionId) { setBinding(null); setError(null); return; }
        let cancelled = false;
        let reference = null;
        try {
          reference = sessions.retain(sessionId, { source: 'controllerOperation' });
          refRef.current = reference;
          reference.ready.then((b) => {
            if (!cancelled) setBinding(b);
          }).catch((e) => {
            if (!cancelled) setError(String(e));
          });
        } catch (e) {
          setError(String(e));
        }
        return () => {
          cancelled = true;
          try { refRef.current?.release(); } catch {}
          refRef.current = null;
          setBinding(null);
        };
      }, [sessionId, sessions]);

      // Subscribe to the event source once binding is ready.
      const [events, setEvents] = useState([]);
      useEffect(() => {
        if (!binding?.eventSource) return;
        const es = binding.eventSource;
        const update = () => {
          const w = es.getSnapshot();
          setEvents(w?.entries ?? []);
        };
        update();
        return es.subscribe(update);
      }, [binding]);

      // Auto-scroll to bottom on new events.
      useEffect(() => {
        const el = bodyRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [events.length]);

      if (!sessionId) return h('div', { style: { textAlign: 'center', marginTop: 40, color: 'var(--dsw-alias-label-caption, #999)' } }, '从上方选择会话');
      if (error) return h('div', { style: { padding: 12, color: 'var(--dsw-alias-state-error, #e00)' } }, `加载失败: ${error}`);
      if (!binding) return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)' } }, '加载中…');

      // Render the last N events as simple text rows.
      const visible = events.slice(-50); // last 50 events max
      return h('div', { ref: bodyRef, style: { flex: 1, overflow: 'auto', padding: 8, fontSize: 12, lineHeight: 1.5 } },
        visible.map((entry, idx) => {
          const ev = entry.event;
          const type = ev?.type ?? 'unknown';
          // Extract display text based on event type.
          let text = '';
          let cls = 'dsws-ev';
          if (type === 'user/message') {
            const blocks = ev?.data?.content ?? [];
            text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
            cls += ' dsws-ev-user';
          } else if (type === 'assistant/message') {
            const blocks = ev?.data?.message?.content ?? [];
            text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
            cls += ' dsws-ev-assistant';
          } else if (type === 'assistant/live-chunk') {
            text = ev?.data?.chunk?.text ?? '';
            cls += ' dsws-ev-assistant dsws-ev-live';
          } else if (type === 'tool/result') {
            text = `[tool] ${ev?.data?.name ?? ''}`;
            cls += ' dsws-ev-tool';
          } else if (type === 'turn/start') {
            text = `— 第 ${ev?.data?.turn} 轮 —`;
            cls += ' dsws-ev-divider';
          } else {
            return null; // skip non-display events
          }
          if (!text) return null;
          return h('div', { key: idx, className: cls, style: rowStyle(cls) }, text);
        }),
      );
    }

    function rowStyle(cls) {
      const base = { padding: '4px 8px', marginBottom: 4, borderRadius: 4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' };
      if (cls.includes('dsws-ev-user')) return { ...base, background: 'var(--dsw-alias-bg-elevated, #2a2a2a)', color: 'var(--dsw-alias-label-primary, #eee)' };
      if (cls.includes('dsws-ev-assistant')) return { ...base, color: 'var(--dsw-alias-label-primary, #eee)' };
      if (cls.includes('dsws-ev-tool')) return { ...base, color: 'var(--dsw-alias-label-secondary, #888)', fontStyle: 'italic' };
      if (cls.includes('dsws-ev-divider')) return { ...base, textAlign: 'center', color: 'var(--dsw-alias-label-caption, #999)', fontSize: 11 };
      return base;
    }

    // ---------- split grid panel ----------
    function SplitMain(props) {
      const sessions = props.__sessions;
      const subscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions]);
      const getSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions]);
      const list = useSyncExternalStore(subscribe, getSnapshot);

      // Load persisted layout.
      const saved = useRef(loadLayout()).current;
      const [gridSize, setGridSize] = useState(saved?.gridSize ?? 2);
      const [cells, setCells] = useState(() => {
        const s = saved?.cells ?? [];
        const size = (saved?.gridSize ?? 2) ** 2;
        const arr = Array(size).fill(null);
        for (let i = 0; i < Math.min(s.length, size); i++) arr[i] = s[i] ?? null;
        return arr;
      });

      const items = list?.ids?.map((id) => list.byId[id]).filter(Boolean) ?? [];
      const nonBlank = items.filter((s) => !s.blank);

      const setCell = (idx, sessionId) => {
        setCells((prev) => { const next = [...prev]; next[idx] = sessionId; return next; });
      };

      // Resize cells array when gridSize changes.
      useEffect(() => {
        const size = gridSize * gridSize;
        setCells((prev) => {
          const next = Array(size).fill(null);
          for (let i = 0; i < Math.min(prev.length, size); i++) next[i] = prev[i];
          return next;
        });
      }, [gridSize]);

      // Persist on change.
      useEffect(() => { saveLayout(gridSize, cells); }, [gridSize, cells]);

      const total = gridSize * gridSize;

      const cellStyle = {
        border: '1px solid var(--dsw-alias-border-l3, #444)',
        borderRadius: 8, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minHeight: 0,
        background: 'var(--dsw-alias-bg-base, transparent)',
      };
      const cellHeaderStyle = {
        padding: '8px 12px', fontSize: 13, fontWeight: 500,
        borderBottom: '1px solid var(--dsw-alias-border-l3, #444)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        color: 'var(--dsw-alias-label-primary, inherit)',
      };
      const selectStyle = {
        fontSize: 12, padding: '2px 6px', maxWidth: 180,
        background: 'var(--dsw-alias-bg-base, transparent)',
        color: 'var(--dsw-alias-label-primary, inherit)',
        border: '1px solid var(--dsw-alias-border-l3, #444)',
        borderRadius: 4,
      };
      const dotStyle = (running) => ({
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: running ? 'var(--dsw-alias-state-success, #4caf50)' : 'var(--dsw-alias-label-caption, #999)',
      });
      const toolbarStyle = {
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', flexShrink: 0,
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
        // toolbar
        h('div', { style: toolbarStyle },
          h('span', { style: { fontWeight: 600, fontSize: 15 } }, '分屏视图'),
          h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
            `${nonBlank.length} 个会话`),
          h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' } },
            h('span', { style: { fontSize: 12 } }, '网格:'),
            [2, 3, 4].map((n) =>
              h('button', {
                key: n, style: { ...btnStyle, fontWeight: gridSize === n ? 700 : 400 },
                onClick: () => setGridSize(n),
              }, `${n}×${n}`)
            ),
            h('button', {
              style: btnStyle,
              onClick: () => { try { window.__dswsToggle?.(); } catch (_e) {} },
            }, '退出分屏'),
          ),
        ),
        // grid
        h('div', { style: gridStyle },
          Array.from({ length: total }, (_, i) => {
            const sid = cells[i];
            const sess = sid ? nonBlank.find((s) => s.id === sid) : null;
            return h('div', { key: i, style: cellStyle },
              h('div', { style: cellHeaderStyle },
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
      apply(ctx) {
        let inSplit = false;
        window.__dswsToggle = () => {
          inSplit = !inSplit;
          try { ctx.layout.selectPanel(inSplit ? 'split' : null); } catch (_e) {}
        };
        ctx.effect(() => () => { try { delete window.__dswsToggle; } catch (_e) {} }, 'workspace-split: cleanup');

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
          return h(SplitMain, { __sessions: sessionsRef });
        }));
      },
    };
  },
});
