'use strict';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const Meta = imports.gi.Meta;

let _windowCreatedId;
const wm_class_not_maximize = [
    "org.gnome.Calendar",
    "org.gnome.Settings",
    "org.gnome.clocks",
    "org.telegram.desktop",
    "Slack",
    "threema-web",
    "chrome-avaremotecit.cloud.com__Citrix_StoreWeb_-Default"
  ];


export default class MaxIfLonely extends Extension {
  enable() {
    _windowCreatedId = global.display.connect("window-created", (d, win) => {
      // Only try to maximize windows that are marked to support this.
      // Other windows (e.g. dialogs) can often actually be maximized,
      // but then no longer unmaximized by the user, so we really need
      // to check this.
      // Check if there there no other window on the workspace
      // get_wm_class()
      // get_title()
      const w = win
        .get_workspace()
        .list_windows()
        .filter(
          (w) =>
            w !== win &&
            !w.is_always_on_all_workspaces() &&
            !w.minimized &&
            wm_class_not_maximize.indexOf(w.get_wm_class()) === -1 &&
            win.get_monitor() === w.get_monitor(),
        );
      const act = win.get_compositor_private();
      const id = act.connect("first-frame", (_) => {
        //.filter(w => w !== win && !w.is_always_on_all_workspaces() && (w.get_maximized() === Meta.MaximizeFlags.BOTH) && !w.minimized && win.get_monitor() == w.get_monitor());
        //
        //https://github.com/Fmstrat/wintile/blob/master/extension.js
        const space = global.workspace_manager
          .get_active_workspace()
          .get_work_area_for_monitor(win.get_monitor());
        const isPortrait = space.width < space.height;
        const isNotUltrawide =
          space.height / space.width < 1.9 && space.width / space.height < 1.9;

        if (w.length === 0 || (w.length === 1 && !isNotUltrawide)) {
          if (win.can_maximize() && wm_class_not_maximize.indexOf(win.get_wm_class()) === -1) {
            // let ws = global.workspace_manager.get_workspace_by_index(0);
            // let area = ws.get_work_area_for_monitor(0);

            if (isNotUltrawide) {
              //win.move_frame(true, space.x + Math.trunc(space.width / 2), space.y);
              //win.move_resize_frame(true, space.x + Math.trunc(space.width / 2), space.y, Math.trunc(space.width / 2), space.height );
              //win.maximize(Meta.MaximizeFlags.HORIZONTAL);
              win.move_frame(true, space.x, space.y);
              win.maximize(Meta.MaximizeFlags.BOTH);
            } else {
              if (!isPortrait) {
                if (w.length === 0) {
                  win.move_frame(true, space.x, space.y);
                  win.move_resize_frame(
                    true,
                    space.x,
                    space.y,
                    Math.trunc(space.width / 2),
                    space.height,
                  );
                } else if (w.length === 1) {
                //} else if (w.length === 1 && !w.is_monitor_sized()) {
                  win.move_frame(
                    true,
                    space.x + Math.trunc(space.width / 2),
                    space.y,
                  );
                  win.move_resize_frame(
                    true,
                    space.x + Math.trunc(space.width / 2),
                    space.y,
                    Math.trunc(space.width / 2),
                    space.height,
                  );
                }
                win.maximize(Meta.MaximizeFlags.VERTICAL);
              } else {
                if (w.length === 0) {
                  win.move_frame(true, space.x, space.y);
                  win.move_resize_frame(
                    true,
                    space.x,
                    space.y,
                    space.width,
                    Math.trunc(space.height / 2),
                  );
                } else if (w.length === 1) {
                //} else if (w.length === 1 && !w.is_monitor_sized()) {
                  win.move_frame(
                    true,
                    space.x,
                    space.y + Math.trunc(space.height / 2),
                  );
                  win.move_resize_frame(
                    true,
                    space.x,
                    space.y + Math.trunc(space.height / 2),
                    space.width,
                    Math.trunc(space.height / 2),
                  );
                }
                win.maximize(Meta.MaximizeFlags.HORIZONTAL);
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

  disable() {
    global.display.disconnect(_windowCreatedId);
  }
}
