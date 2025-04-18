'use strict';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

const ASPECT_RATIO_ULTRAWIDE = 21 / 9;
const ASPECT_RATIO_EXTRA_ULTRAWIDE = 32 / 9;

function isVerticallyMaximized(window, workArea) {
    const windowRect = window.get_frame_rect();
    return windowRect.y === workArea.y && windowRect.height === workArea.height;
}

function isHorizontallyMaximized(window, workArea) {
    const windowRect = window.get_frame_rect();
    return windowRect.x === workArea.x && windowRect.width === workArea.width;
}

function isMaximized(window, workArea) {
    return isVerticallyMaximized(window, workArea) && isHorizontallyMaximized(window, workArea);
}

export default class MaxIfLonely extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._wmClassNotMaximize = this._settings.get_strv('wm-class-not-maximize');

    // Connect to the 'changed' signal of the 'wm-class-not-maximize' setting
    this._settingsChangedId = this._settings.connect('changed::wm-class-not-maximize', () => {
      this._wmClassNotMaximize = this._settings.get_strv('wm-class-not-maximize');
    });

    this._windowCreatedId = global.display.connect("window-created", (d, win) => {
      const w = win
        .get_workspace()
        .list_windows()
        .filter(
          (w) =>
            w !== win &&
            !w.is_always_on_all_workspaces() &&
            !w.minimized &&
            w.get_role() !== "pop-up" &&
            this._wmClassNotMaximize.indexOf(w.get_wm_class()) === -1 &&
            win.get_monitor() === w.get_monitor() &&
            (
              isVerticallyMaximized(w, global.workspace_manager.get_active_workspace().get_work_area_for_monitor(w.get_monitor())) ||
              isHorizontallyMaximized(w, global.workspace_manager.get_active_workspace().get_work_area_for_monitor(w.get_monitor()))
            ),
        );
      const act = win.get_compositor_private();
      const id = act.connect("first-frame", (_) => {
        const space = global.workspace_manager
          .get_active_workspace()
          .get_work_area_for_monitor(win.get_monitor());
        const isPortrait = space.width < space.height;

        const aspectRatio = space.width / space.height;
        const isUltrawide = aspectRatio > ASPECT_RATIO_ULTRAWIDE;
        const isExtraUltrawide = aspectRatio > ASPECT_RATIO_EXTRA_ULTRAWIDE;

        if (w.length === 0 || (w.length === 1 && (isUltrawide || isExtraUltrawide)) || (w.length === 2 && isExtraUltrawide)) {
          if (win.can_maximize() && win.get_role() !== "pop-up" && this._wmClassNotMaximize.indexOf(win.get_wm_class()) === -1) {
            if (!isUltrawide && !isExtraUltrawide) {
              win.move_frame(true, space.x, space.y);
              win.maximize(Meta.MaximizeFlags.BOTH);
            } else {
              const windowWidth = Math.trunc(space.width / (isExtraUltrawide ? 3 : 2));

              if (!isPortrait) {
                if (isHorizontallyMaximized(win, space)) {
                  win.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
                }
                win.maximize(Meta.MaximizeFlags.VERTICAL);

                if (w.length === 0) {
                  win.move_frame(true, space.x, space.y);
                  win.move_resize_frame(
                    true,
                    space.x,
                    space.y,
                    windowWidth,
                    space.height,
                  );
                } else if (w.length === 1 && !isMaximized(w[0], space)) {
                  // Calculate the position of the first window
                  const firstWindow = w[0];
                  const firstWindowRect = firstWindow.get_frame_rect();

                  // Place the second window on the left if the first window is on the right half
                  const secondWindowX = firstWindowRect.x > space.x + windowWidth / 2
                    ? space.x
                    : space.x + windowWidth;

                  win.move_frame(true, secondWindowX, space.y);
                  win.move_resize_frame(
                    true,
                    secondWindowX,
                    space.y,
                    windowWidth,
                    space.height,
                  );
                } else if (w.length === 2) {
                  // Find the empty space
                  const firstWindow = w[0];
                  const secondWindow = w[1];
                  const firstWindowRect = firstWindow.get_frame_rect();
                  const secondWindowRect = secondWindow.get_frame_rect();

                  let thirdWindowX = space.x;

                  if (firstWindowRect.x > space.x + windowWidth) {
                    thirdWindowX = space.x; // Left side is empty
                  } else if (secondWindowRect.x > firstWindowRect.x + windowWidth) {
                    thirdWindowX = space.x + windowWidth; // Middle is empty
                  } else {
                    thirdWindowX = space.x + 2 * windowWidth; // Right side is empty
                  }

                  win.move_frame(true, thirdWindowX, space.y);
                  win.move_resize_frame(
                    true,
                    thirdWindowX,
                    space.y,
                    windowWidth,
                    space.height,
                  );
                }
              } else {
                // Portrait orientation for ultrawide/extra ultrawide not implemented
                // You can add similar logic here if needed
              }
            }
          }
        } else {
          win.unmaximize(Meta.MaximizeFlags.BOTH);
        }
        win.focus(global.get_current_time());
        act.disconnect(id);
      });
    });
  }

  disable() {
    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId);
    }
    global.display.disconnect(this._windowCreatedId);
    this._settings = null;
  }
}
