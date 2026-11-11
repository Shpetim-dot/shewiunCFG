/* Shared notification and chat presentation helpers. Loaded before app.js. */
(function (global) {
  'use strict';
  global.ShewiunNotif = function (deps) {
    const { h, when, icon, btn, openNote } = deps;
    const ago = (ts) => {
      const t = Date.parse(/(Z|[+-]\\d\\d:?\\d\\d)$/.test(ts || '') ? ts : (ts || '') + 'Z');
      if (!t) return when(ts);
      const d = Math.max(0, (Date.now() - t) / 1000);
      return d < 60 ? 'now' : d < 3600 ? Math.floor(d / 60) + ' min' : d < 86400 ? Math.floor(d / 3600) + ' h' : Math.floor(d / 86400) + ' d';
    };
    function toast(msg, kind) {
      let box = document.getElementById('toasts');
      if (!box) { box = h('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
      const el = h('div', { class: 'toast' + (kind === 'bad' ? ' bad' : ''), role: kind === 'bad' ? 'alert' : 'status' },
        h('span', { class: 'toast-text' }, String(msg)),
        h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', onclick: () => el.remove() }, icon('x', 14)));
      box.append(el); while (box.children.length > 3) box.firstChild.remove();
      setTimeout(() => el.remove(), kind === 'bad' ? 7000 : 4200);
    }
    function chatRow(b, m, prev, tile) {
      if (m.role !== 'agent') return h('div', { class: 'msgrow user' }, h('div', { class: 'msg user' }, m.content));
      const cont = !!prev && prev.role === 'agent';
      return h('div', { class: 'msgrow agent' + (cont ? ' cont' : '') },
        h('span', { class: 'msgav' }, cont ? null : tile(b, 36)),
        h('div', { class: 'msgmain' },
          cont ? null : h('div', { class: 'msghead' }, h('b', {}, b.name), h('span', { class: 'muted' }, b.role), m.created_at ? h('span', { class: 'muted mono' }, when(m.created_at)) : null),
          h('div', { class: 'msg agent' }, m.content),
          h('small', { class: 'muted msgsrc' }, m.used && m.used.length ? ['Based on: ', m.used.flatMap((u) => [btn(u.title, () => openNote(u.id), 'link'), ' '])] : 'Based on no verified notes'),
          m.note ? h('small', {}, btn('Saved to Brain as draft', () => openNote(m.note), 'link')) : null));
    }
    const chatTyping = (b, tile) => h('div', { class: 'msgrow agent' },
      h('span', { class: 'msgav' }, tile(b, 36, { thinking: true })),
      h('div', { class: 'msgmain' },
        h('div', { class: 'msghead' }, h('b', {}, b.name), h('span', { class: 'muted' }, 'is answering…')),
        h('div', { class: 'skel-lines', 'aria-hidden': 'true' }, h('span', { class: 'skel-line' }), h('span', { class: 'skel-line short' }))));
    return { ago, toast, chatRow, chatTyping };
  };
})(window);
