// DSH serves this entry directly to its browser module loader.
window.__ModuleLoader__.load({
  id: 'dsh-wisdom-fountain',
  factory() {
    return {
      inject: ['commandUi'],
      apply(ctx) {
        ctx.on('command/executed', (_sessionId, name, result) => {
          if (name !== 'juche' || result.kind !== 'success') return
          const match = /^智慧之泉 · (http:\/\/127\.0\.0\.1:\d{1,5})$/.exec(result.text ?? '')
          if (match) window.location.assign(match[1])
        })
      },
    }
  },
})
