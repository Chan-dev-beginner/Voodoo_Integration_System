window.addEventListener('DOMContentLoaded', () => {
  const model = new AppModel();
  const view = new AppView(model);
  window.voodooApp = new AppController(model, view);
  setInterval(() => view.clock(), 30000);
});
