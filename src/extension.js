const Meta = imports.gi.Meta;

let _windowCreatedId;

function enable() {
    _windowCreatedId = global.display.connect("window-created", (d, win) => {
        // Only try to maximize windows that are marked to support this.
        // Other windows (e.g. dialogs) can often actually be maximized,
        // but then no longer unmaximized by the user, so we really need
        // to check this.
        const act = win.get_compositor_private();
        const id = act.connect('first-frame', _ => {

          // Check if there there no other window on the workspace
          const w = win
              .get_workspace()
              .list_windows()
              .filter(
                  (w) =>
                  w !== win &&
                  !w.is_always_on_all_workspaces() &&
                  !w.minimized &&
                  win.get_monitor() === w.get_monitor(),
              );
          //.filter(w => w !== win && !w.is_always_on_all_workspaces() && (w.get_maximized() === Meta.MaximizeFlags.BOTH) && !w.minimized && win.get_monitor() == w.get_monitor());
          //
          //https://github.com/Fmstrat/wintile/blob/master/extension.js

          if (w.length === 0) {
              if (win.can_maximize() && win.get_role() !== "pop-up") {
                  // let ws = global.workspace_manager.get_workspace_by_index(0);
                  // let area = ws.get_work_area_for_monitor(0);

                  let space = global.workspace_manager.get_active_workspace().get_work_area_for_monitor(win.get_monitor());
                  let isPortrait = space.width < space.height;
                  let isNotUltrawide = (space.height / space.width) < 1.9 && (space.width / space.height) < 1.9;
                  win.move_frame(true, space.x, space.y);
                  if (isNotUltrawide) {
                      //win.move_resize_frame(true, 0, 0, space.width, space.height);
                      win.maximize(Meta.MaximizeFlags.BOTH);
                  } else {
                      if (isPortrait) {
                          //win.move_resize_frame(true, space.x, space.y, Math.floor(space.width / 2), space.height);
                          win.maximize(Meta.MaximizeFlags.HORIZONTAL)
                      } else {
                          //win.move_resize_frame(true, space.x, space.y, space.width, Math.floor(space.height / 2));
                          win.maximize(Meta.MaximizeFlags.VERTICAL)
                          /*
                           * x - desired x value
                           * y - desired y value
                           * w - desired width
                           * h - desired height
                           */
                          //win.move_frame(true, x, y);
                          //win.move_resize_frame(true, x, y, w, h);
                      }
                  }
              }
          } else {
              // Workaround for dialogs that were previously maximized by
              // us (when we did not check for can_maximize yet) and
              // remember their size.
              win.unmaximize(Meta.MaximizeFlags.BOTH);
          }
          win.focus(global.get_current_time());
          act.disconnect(id);
        });
    });
}

function disable() {
    global.display.disconnect(_windowCreatedId);
}
