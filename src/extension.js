const Meta = imports.gi.Meta;

let _windowCreatedId;

function enable() {
  _windowCreatedId = global.display.connect('window-created', (d, win) => {
    // Only try to maximize windows that are marked to support this.
    // Other windows (e.g. dialogs) can often actually be maximized,
    // but then no longer unmaximized by the user, so we really need
    // to check this.

    // Check if there there no other window on the workspace
    let w = win.get_workspace().list_windows()
      .filter(w => w !== win && !w.is_always_on_all_workspaces() && win.get_monitor() == w.get_monitor());

    //let display = win.get_workspace().get_display().get_size()
    //let displayratio = display.width/display.height

    if (win.can_maximize() && w.length == 0 && win.get_role() != 'pop-up') {
      win.maximize(Meta.MaximizeFlags.BOTH)
    //} else if (win.maximized_vertically) {
    //    win.unmaximize(Meta.MaximizeFlags.VERTICAL)
    //} else if (win.maximized_horizontally) {
    //    win.unmaximize(Meta.MaximizeFlags.HORIZONTAL)
    } else {
      // Workaround for dialogs that were previously maximized by
      // us (when we did not check for can_maximize yet) and
      // remember their size.
      win.unmaximize(Meta.MaximizeFlags.BOTH)
    }
  });
}

function disable() {
  global.display.disconnect(_windowCreatedId);
}
