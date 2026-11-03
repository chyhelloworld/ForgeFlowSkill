/**
 * ForgeFlow board panel (DSH client half).
 *
 * Read-only view over the snapshot written by generate-board.mjs. The panel
 * lives in the left sidebar entry plus a main panel, and reads the snapshot via
 * the host workspace-files API so no HTTP server or extra state is introduced.
 */
window.__ModuleLoader__.load({
  id: '@local/forgeflow-dsh',
  factory: function (require) {
    try {
      return createPlugin(require);
    } catch (error) {
      if (typeof console !== 'undefined') console.error('[forgeflow-board] init failed', error);
      return { inject: [], apply: function () {} };
    }
  },
});

function createPlugin(require) {
  var React = require('react');
  var h = React.createElement;
  var PANEL_ID = 'ff-board';
  var TITLE = 'ForgeFlow 看板';
  var BOARD_PATH = '.forgeflow/board.json';
  var COLORS = {
    text: 'var(--dsw-alias-label-primary)',
    muted: 'var(--dsw-alias-label-secondary)',
    faint: 'var(--dsw-alias-label-tertiary)',
    bg: 'var(--dsw-alias-bg-layer-1)',
    card: 'var(--dsw-alias-bg-layer-2)',
    border: 'var(--dsw-alias-border-l1)',
    brand: 'var(--dsw-alias-brand-primary)',
    warn: 'var(--dsw-alias-state-warn-primary)',
    error: 'var(--dsw-alias-state-error-primary)',
  };

  function service(ctx, name) {
    if (!ctx) return null;
    if (typeof ctx.get === 'function') {
      try {
        return ctx.get(name) || null;
      } catch (error) {
        return null;
      }
    }
    return ctx[name] || null;
  }

  function snapshot(serviceValue) {
    if (!serviceValue || !serviceValue.list || typeof serviceValue.list.getSnapshot !== 'function') return null;
    try {
      return serviceValue.list.getSnapshot();
    } catch (error) {
      return null;
    }
  }

  function samePath(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string') return false;
    return left.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase() === right.replace(/[\\/]+/g, '/').replace(/\/+$/, '').toLowerCase();
  }

  function currentSession(ctx) {
    var sessions = service(ctx, 'sessions');
    var data = snapshot(sessions);
    if (!data || !data.byId) return null;
    var rows = Object.keys(data.byId).map(function (id) {
      return Object.assign({ id: id }, data.byId[id] || {});
    });
    rows.sort(function (left, right) {
      return (right.updatedAt || 0) - (left.updatedAt || 0);
    });
    var active = rows.find(function (row) {
      return row.retainedBy && (row.retainedBy.mainView || 0) > 0;
    });
    return active || rows[0] || null;
  }

  function scopeFor(ctx, selectedWorkspaceId) {
    var workspaces = service(ctx, 'workspaces');
    var data = snapshot(workspaces);
    var items = data && Array.isArray(data.items) ? data.items : [];
    var active = currentSession(ctx);
    var workspace = null;
    if (selectedWorkspaceId) {
      workspace = items.find(function (item) { return item.workspaceId === selectedWorkspaceId; }) || null;
    }
    if (!workspace && active) {
      workspace = items.find(function (item) {
        return samePath(item.path, active.cwd) || (Array.isArray(item.sessionIds) && item.sessionIds.indexOf(active.id) >= 0);
      }) || null;
    }
    if (!workspace && items.length) workspace = items[0];
    if (!workspace && active && active.cwd) {
      workspace = { workspaceId: null, path: active.cwd, title: active.cwd, sessionIds: [active.id] };
    }
    var sessionId = null;
    if (workspace) {
      var belongs = active && (samePath(active.cwd, workspace.path) || (Array.isArray(workspace.sessionIds) && workspace.sessionIds.indexOf(active.id) >= 0));
      if (belongs) sessionId = active.id;
      else if (Array.isArray(workspace.sessionIds) && workspace.sessionIds.length) sessionId = workspace.sessionIds[0];
    }
    return { workspace: workspace, sessionId: sessionId, workspaces: items };
  }

  function unwrap(result) {
    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'ok')) {
      if (result.ok) return result.value;
      throw result.error || new Error('读取失败');
    }
    return result;
  }

  function errorText(error) {
    if (!error) return '未知错误';
    if (typeof error === 'string') return error;
    return error.message || error.code || JSON.stringify(error);
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function validateItems(items, label, fields) {
    if (!Array.isArray(items)) return label + ' 不是数组';
    for (let index = 0; index < items.length; index += 1) {
      var item = items[index];
      if (!isObject(item)) return label + '[' + index + '] 不是对象';
      if (typeof item.id !== 'string' || !item.id) return label + '[' + index + '] 缺少 id';
      if (item.title !== null && item.title !== undefined && typeof item.title !== 'string') return label + '[' + index + '] 的 title 不是字符串';
      if (item.ref !== null && item.ref !== undefined && typeof item.ref !== 'string') return label + '[' + index + '] 的 ref 不是字符串';
      for (var name of fields || []) {
        var value = item[name];
        if (value !== null && value !== undefined && (!Array.isArray(value) || value.some(function (entry) { return typeof entry !== 'string'; }))) {
          return label + '[' + index + '] 的 ' + name + ' 不是字符串数组';
        }
      }
    }
    return null;
  }

  function validateBoard(board) {
    if (!isObject(board) || board.format !== 'ff-board-v1') return '快照格式不是 ff-board-v1';
    if (!isObject(board.intent)) return 'intent 不是对象';
    if (!Array.isArray(board.sources) || board.sources.some(function (source) { return typeof source !== 'string'; })) {
      return 'sources 不是字符串数组';
    }
    var problem = validateItems(board.requirements, 'requirements', ['parent_ids'])
      || validateItems(board.modules, 'modules', ['requirement_ids'])
      || validateItems(board.acceptance, 'acceptance', ['requirement_ids', 'module_ids', 'evidence_refs']);
    if (problem) return problem;
    if (!isObject(board.architecture) || !Array.isArray(board.architecture.items)) return 'architecture.items 不是数组';
    for (var index = 0; index < board.architecture.items.length; index += 1) {
      var item = board.architecture.items[index];
      if (!isObject(item) || typeof item.ref !== 'string') return 'architecture.items[' + index + '] 缺少 ref';
      if (item.title !== null && item.title !== undefined && typeof item.title !== 'string') return 'architecture.items[' + index + '] 的 title 不是字符串';
    }
    if (!isObject(board.tasks) || !Array.isArray(board.tasks.items)) return 'tasks.items 不是数组';
    problem = validateItems(board.tasks.items, 'tasks.items', ['requirement_ids', 'module_ids', 'acceptance_ids']);
    if (problem) return problem;
    for (var taskIndex = 0; taskIndex < board.tasks.items.length; taskIndex += 1) {
      var progressRef = board.tasks.items[taskIndex].progress_ref;
      if (progressRef !== null && progressRef !== undefined && typeof progressRef !== 'string') return 'tasks.items[' + taskIndex + '] 的 progress_ref 不是字符串';
    }
    var progress = board.tasks.progress;
    if (!isObject(progress)) return 'tasks.progress 不是对象';
    if (!(progress.total === null || typeof progress.total === 'number') || !(progress.done === null || typeof progress.done === 'number')) {
      return 'tasks.progress 的 done/total 不是数字或 null';
    }
    if (progress.total !== null) {
      if (!Number.isInteger(progress.total) || progress.total < 0) return 'tasks.progress.total 不是非负整数';
      if (!Number.isInteger(progress.done) || progress.done < 0 || progress.done > progress.total) return 'tasks.progress.done 不在 0..total 内';
    }
    if (progress.reason !== null && progress.reason !== undefined && typeof progress.reason !== 'string') return 'tasks.progress.reason 不是字符串';
    if (!Array.isArray(progress.changes) || progress.changes.some(function (name) { return typeof name !== 'string'; })) {
      return 'tasks.progress.changes 不是字符串数组';
    }
    return null;
  }

  async function loadBoard(ctx, selectedWorkspaceId) {
    var scope = scopeFor(ctx, selectedWorkspaceId);
    if (!scope.workspace) return { status: 'no-workspace', scope: scope };
    if (!scope.sessionId) return { status: 'no-session', scope: scope };
    var remote = service(ctx, 'remote');
    var files = remote && remote.workspaceFiles;
    if (!files || typeof files.read !== 'function') {
      return { status: 'no-remote', scope: scope };
    }
    var absolute = scope.workspace.path.replace(/[\\/]+$/, '') + '/' + BOARD_PATH;
    try {
      var value = unwrap(await files.read(scope.sessionId, absolute, {}, undefined));
      var text = value && typeof value.text === 'string' ? value.text : null;
      if (text === null) return { status: 'read-error', scope: scope, error: '读取结果没有文本内容' };
      var board;
      try {
        board = JSON.parse(text);
      } catch (error) {
        return { status: 'bad-json', scope: scope, error: error };
      }
      var problem = validateBoard(board);
      if (problem) return { status: 'bad-format', scope: scope, format: board && board.format, error: problem };
      return { status: 'ready', scope: scope, board: board };
    } catch (error) {
      var missing = /not.?found|ENOENT|ENOTDIR|no entry at|不存在|no such file/i.test(errorText(error));
      return { status: missing ? 'no-snapshot' : 'read-error', scope: scope, error: error };
    }
  }

  function pill(text, tone) {
    var color = tone === 'error' ? COLORS.error : tone === 'warn' ? COLORS.warn : COLORS.muted;
    return h('span', {
      style: {
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: '999px',
        border: '1px solid ' + COLORS.border,
        color: color,
        fontSize: '11px',
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      },
    }, text);
  }

  function Section(props) {
    return h('section', { style: { marginTop: '20px' } },
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' } },
        h('h3', { style: { margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.text } }, props.title),
        h('span', { style: { color: COLORS.faint, fontSize: '12px' } }, props.count),
      ),
      props.children,
    );
  }

  function Row(props) {
    return h('div', {
      style: {
        padding: '8px 10px',
        border: '1px solid ' + COLORS.border,
        borderRadius: '6px',
        background: COLORS.card,
        marginBottom: '6px',
      },
    }, props.children);
  }

  function Ref(props) {
    return h('span', {
      title: props.children,
      style: {
        color: COLORS.faint,
        fontSize: '11px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        display: 'inline-block',
        verticalAlign: 'bottom',
      },
    }, props.children);
  }

  function Empty(props) {
    return h('div', {
      style: {
        padding: '14px 16px',
        border: '1px dashed ' + COLORS.border,
        borderRadius: '8px',
        color: COLORS.muted,
        fontSize: '13px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
      },
    }, props.children);
  }

  function RequirementBlock(props) {
    var items = props.items || [];
    if (!items.length) return h(Empty, null, '快照里没有需求条目。');
    return h('div', null, items.map(function (item) {
      return h(Row, { key: item.id },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' } },
          h('span', { style: { color: COLORS.brand, fontSize: '12px', fontWeight: 600 } }, item.id),
          h('span', { style: { color: COLORS.text, fontSize: '13px', lineHeight: '1.5' } }, item.title || '（没有标题）'),
        ),
        h('div', { style: { marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' } },
          item.ref ? h(Ref, null, item.ref) : null,
          item.parent_ids && item.parent_ids.length ? h('span', { style: { color: COLORS.faint, fontSize: '11px' } }, '上级 ' + item.parent_ids.join('、')) : null,
        ),
      );
    }));
  }

  function ArchitectureBlock(props) {
    var architecture = props.architecture || {};
    var items = architecture.items || [];
    return h('div', null,
      h('div', { style: { color: COLORS.muted, fontSize: '12px', lineHeight: '1.6', marginBottom: '8px' } }, architecture.note || '没有架构信息。'),
      items.length ? items.map(function (item) {
        return h(Row, { key: item.ref },
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' } },
            h('span', { style: { color: COLORS.text, fontSize: '13px' } }, item.title || item.ref),
            item.exists === false ? pill('文件不存在', 'warn') : null,
          ),
          h('div', { style: { marginTop: '2px' } }, h(Ref, null, item.ref)),
        );
      }) : h(Empty, null, '重新生成时可加 --architecture-doc 指定架构文档。'),
    );
  }

  function ModuleBlock(props) {
    var items = props.items || [];
    if (!items.length) return h(Empty, null, '快照里没有模块条目。');
    return h('div', null, items.map(function (item) {
      return h(Row, { key: item.id },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' } },
          h('span', { style: { color: COLORS.brand, fontSize: '12px', fontWeight: 600 } }, item.id),
          h('span', { style: { color: COLORS.text, fontSize: '13px' } }, item.title || '（没有标题）'),
          item.requirement_ids && item.requirement_ids.length ? pill('需求 ' + item.requirement_ids.join('、')) : null,
        ),
        item.ref ? h('div', { style: { marginTop: '2px' } }, h(Ref, null, item.ref)) : null,
      );
    }));
  }

  function ProgressBlock(props) {
    var tasks = props.tasks || {};
    var progress = tasks.progress || {};
    var items = tasks.items || [];
    var known = typeof progress.total === 'number' && progress.total > 0 && typeof progress.done === 'number';
    var percent = known && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return h('div', null,
      h('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          padding: '10px 12px', background: COLORS.card, border: '1px solid ' + COLORS.border, borderRadius: '8px',
        },
      },
        h('span', { style: { color: COLORS.text, fontSize: '13px', fontWeight: 600 } }, known ? '权威进度 ' + progress.done + ' / ' + progress.total : '权威进度未知'),
        known ? pill(percent + '%') : pill('无可用进度', 'warn'),
        progress.reason ? h('span', { style: { color: COLORS.muted, fontSize: '12px' } }, progress.reason) : null,
      ),
      known ? h('div', { style: { marginTop: '8px', height: '6px', borderRadius: '3px', background: COLORS.border, overflow: 'hidden' } },
        h('div', { style: { width: percent + '%', height: '100%', background: COLORS.brand } }),
      ) : null,
      h('div', { style: { marginTop: '10px' } }, items.length ? items.map(function (item) {
        return h(Row, { key: item.id },
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' } },
            h('span', { style: { color: COLORS.brand, fontSize: '12px', fontWeight: 600 } }, item.id),
            h('span', {
              style: {
                color: COLORS.text, fontSize: '13px', lineHeight: '1.5',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              },
            }, item.title || '（没有标题）'),
          ),
          h('div', { style: { marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' } },
            item.ref ? h(Ref, null, item.ref) : null,
            item.progress_ref ? h('span', { style: { color: COLORS.faint, fontSize: '11px' } }, '进度来源 ' + item.progress_ref) : null,
          ),
        );
      }) : h(Empty, null, '快照里没有任务条目。')),
    );
  }

  function ErrorPanel(props) {
    var state = props.state;
    var text = '';
    if (state.status === 'no-workspace') text = '没有可用的工作区。';
    else if (state.status === 'no-session') text = '这个工作区还没有可用于读取文件的会话。先在左侧打开或创建一个会话，再回到此面板。';
    else if (state.status === 'no-remote') text = '当前宿主没有暴露 workspaceFiles 读取能力。';
    else if (state.status === 'no-snapshot') text = '未找到 .forgeflow/board.json。\n在项目根运行：node .forgeflow/dsh-plugin/generate-board.mjs --write';
    else if (state.status === 'bad-json') text = '快照不是合法 JSON：' + errorText(state.error);
    else if (state.status === 'bad-format') text = '快照格式不受支持：' + String(state.format) + '（期望 ff-board-v1）。' + (state.error ? '\n' + state.error : '');
    else text = '读取快照失败：' + errorText(state.error);
    return h(Empty, null, text);
  }

  function Board(props) {
    var ctx = props.ctx;
    var first = React.useState(null);
    var state = first[0];
    var setState = first[1];
    var selected = React.useState(null);
    var selectedWorkspaceId = selected[0];
    var setSelectedWorkspaceId = selected[1];
    var busy = React.useState(false);
    var loading = busy[0];
    var setLoading = busy[1];
    var sequence = React.useRef(0);

    var refresh = React.useCallback(async function (workspaceId) {
      sequence.current += 1;
      var current = sequence.current;
      setLoading(true);
      try {
        var next = await loadBoard(ctx, workspaceId === undefined ? null : workspaceId);
        if (sequence.current === current) setState(next);
      } catch (error) {
        if (sequence.current === current) setState({ status: 'read-error', error: error });
      } finally {
        if (sequence.current === current) setLoading(false);
      }
    }, [ctx]);

    React.useEffect(function () {
      refresh(null);
    }, [refresh]);

    React.useEffect(function () {
      return function () { sequence.current += 1; };
    }, []);

    var scope = state && state.scope ? state.scope : scopeFor(ctx, selectedWorkspaceId);
    var workspace = scope.workspace;
    var workspaces = scope.workspaces || [];
    var board = state && state.status === 'ready' ? state.board : null;

    return h('div', { style: { height: '100%', overflow: 'auto', padding: '18px 22px', background: COLORS.bg, color: COLORS.text } },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' } },
        h('div', { style: { flex: '1 1 240px', minWidth: 0 } },
          h('h2', { style: { margin: 0, fontSize: '16px', fontWeight: 600 } }, TITLE),
          h('div', { style: { color: COLORS.faint, fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' } },
            workspace ? workspace.path : '未识别工作区',
            board ? ' · 快照 ' + BOARD_PATH : '',
          ),
        ),
        workspaces.length > 1 ? h('select', {
          value: workspace && workspace.workspaceId ? workspace.workspaceId : '',
          onChange: function (event) {
            var value = event.target.value;
            setSelectedWorkspaceId(value);
            refresh(value);
          },
          style: {
            background: COLORS.card, color: COLORS.text, border: '1px solid ' + COLORS.border,
            borderRadius: '6px', padding: '5px 8px', fontSize: '12px', maxWidth: '260px',
          },
        }, workspaces.map(function (item) {
          return h('option', { key: item.workspaceId, value: item.workspaceId }, item.title || item.path);
        })) : null,
        h('button', {
          type: 'button',
          onClick: function () { refresh(workspace && workspace.workspaceId ? workspace.workspaceId : null); },
          disabled: loading,
          style: {
            background: COLORS.card, color: COLORS.text, border: '1px solid ' + COLORS.border,
            borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: loading ? 'default' : 'pointer',
          },
        }, loading ? '刷新中…' : '刷新'),
      ),
      state === null ? h('div', { style: { marginTop: '18px', color: COLORS.muted, fontSize: '13px' } }, '正在读取快照…') : null,
      state !== null && state.status !== 'ready' ? h('div', { style: { marginTop: '18px' } }, h(ErrorPanel, { state: state })) : null,
      board ? h('div', null,
        h(Section, {
          title: '需求',
          count: '共 ' + (board.requirements || []).length + ' 条 · 基线 ' + String((board.intent && board.intent.baseline_ref) || '未标注'),
        }, h(RequirementBlock, { items: board.requirements })),
        h(Section, { title: '架构', count: (board.architecture && board.architecture.items ? board.architecture.items.length : 0) + ' 份参考文档' },
          h(ArchitectureBlock, { architecture: board.architecture })),
        h(Section, { title: '模块', count: '共 ' + (board.modules || []).length + ' 个' },
          h(ModuleBlock, { items: board.modules })),
        h(Section, { title: '任务进度', count: '共 ' + ((board.tasks && board.tasks.items) || []).length + ' 个任务' },
          h(ProgressBlock, { tasks: board.tasks })),
        h('div', { style: { marginTop: '18px', color: COLORS.faint, fontSize: '11px', lineHeight: '1.6' } },
          '只读快照。数据来源：' + (board.sources || []).join('、') + '。更新快照后点“刷新”。',
        ),
      ) : null,
    );
  }

  function Icon() {
    return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
      h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
      h('path', { d: 'M3 9h18' }),
      h('path', { d: 'M9 9v11' }),
    );
  }

  function guarded(label, register) {
    return function () {
      try {
        return register();
      } catch (error) {
        if (typeof console !== 'undefined') console.error('[forgeflow-board] ' + label + ' registration failed', error);
        return undefined;
      }
    };
  }

  // The host may apply a client plugin twice (for example after a hot reload or a
  // profile re-read). A slot rejects duplicate ids/keys, so check the live slot
  // before registering and treat an already-present entry as success.
  function alreadyRegistered(ctx, slotName, matches) {
    try {
      if (!ctx.slots || typeof ctx.slots.entries !== 'function') return false;
      var entries = ctx.slots.entries(slotName);
      return Array.isArray(entries) && entries.some(function (entry) {
        return entry && entry.options && matches(entry.options);
      });
    } catch (error) {
      return false;
    }
  }

  function apply(ctx) {
    var pluginCtx = ctx;
    try {
      ctx.slots.inject('sidebar.panellist', guarded('sidebar', function () {
        if (alreadyRegistered(ctx, 'sidebar.panellist', function (options) { return options.id === PANEL_ID; })) return undefined;
        return ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 21,
          label: function () { return TITLE; },
        }, Icon);
      }));
      ctx.slots.inject('main', guarded('main', function () {
        if (alreadyRegistered(ctx, 'main', function (options) { return options.key === PANEL_ID; })) return undefined;
        return ctx.slots.register({ name: 'main', key: PANEL_ID }, function () {
          return h(Board, { ctx: pluginCtx });
        });
      }));
    } catch (error) {
      if (typeof console !== 'undefined') console.error('[forgeflow-board] register failed', error);
    }
  }

  var plugin = { inject: ['slots', 'sessions', 'workspaces', 'remote', 'remote.workspaceFiles'], apply: apply };
  plugin.__test = { validateBoard: validateBoard, scopeFor: scopeFor, loadBoard: loadBoard, samePath: samePath };
  return plugin;
}
