'use strict';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

const WM_CLASS_NOT_MAXIMIZE_KEY = 'wm-class-not-maximize';

export default class MaxIfLonelyPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this.settings = this.getSettings();
        this._settingsChangedId = null;
        this.window = window;

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        this.window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Non-Maximize WM_CLASS List'),
            description: _('Add or remove WM_CLASS entries that should not be auto-maximized or tiled.'),
        });
        page.add(group);

        // Store group reference for easy access in methods
        this._group = group;

        // Load existing entries
        const existingClasses = this.settings.get_strv(WM_CLASS_NOT_MAXIMIZE_KEY);
        existingClasses.forEach(wmClass => {
            if (wmClass && wmClass.trim() !== '') {
                this._addEntryRow(wmClass);
            }
        });

        // Add button
        const addButton = new Gtk.Button({
            label: _('Add WM Class'),
            icon_name: 'list-add-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Add New WM Class Entry'),
        });

        addButton.connect('clicked', () => {
            const newRow = this._addEntryRow(null);
            // Use timeout to ensure the widget is ready for focus after being added
            GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 0, () => {
                 // Check if row still exists before focusing (might be removed if Apply is hit while empty)
                 if (newRow.get_parent() === this._group) {
                    // Focus the entry within the row for immediate typing
                    const entry = newRow.get_activatable_widget();
                    if (entry && entry instanceof Gtk.Editable) {
                        entry.grab_focus();
                    } else {
                         newRow.grab_focus();
                    }
                 }
                 return GLib.SOURCE_REMOVE;
            });
        });

        group.set_header_suffix(addButton);
    }

    _addEntryRow(initialText) {
        // Ensure initialText is treated consistently as null if effectively empty
        const effectiveInitialText = (initialText && initialText.trim() !== '') ? initialText.trim() : null;

        const wmClassRow = new Adw.EntryRow({
            title: _('WM Class'),
            text: effectiveInitialText || '',
            show_apply_button: true,
            editable: true,
        });

        // Store the original value (or null for new rows) to find it in settings later
        wmClassRow._originalValue = effectiveInitialText;

        const onApply = () => {
            const currentText = wmClassRow.get_text().trim();
            const originalValue = wmClassRow._originalValue;
            let currentList = this.settings.get_strv(WM_CLASS_NOT_MAXIMIZE_KEY);
            let listChanged = false;

            if (originalValue) {
                // Editing an existing entry (originalValue is not null and not empty)
                const index = currentList.indexOf(originalValue);
                if (index > -1) {
                    if (currentText === '') {
                        // Text cleared - remove entry from list and UI
                        currentList.splice(index, 1);
                        listChanged = true;
                        // Remove UI row immediately after applying an empty edit
                        if (wmClassRow.get_parent() === this._group) {
                           this._group.remove(wmClassRow);
                        }
                    } else if (currentText !== originalValue) {
                        // Text changed - update entry in list
                        // Check if the new value already exists elsewhere in the list
                        if (!currentList.includes(currentText)) {
                            currentList[index] = currentText;
                            wmClassRow._originalValue = currentText; // Update original value tracker
                            listChanged = true;
                        } else {
                            // New value is a duplicate of another existing entry.
                            // Revert the text in the entry row to the original value
                            // Or remove this row if the duplicate is the only other entry?
                            // Simplest: Revert and don't change settings. User can delete manually if needed.
                            wmClassRow.set_text(originalValue);
                            // Optionally show a notification/toast about the duplicate?
                            log(`Cannot rename WM Class: "${currentText}" already exists in the list.`);
                        }
                    }
                    // If currentText === originalValue, do nothing to list or UI row state
                } else {
                    // Original value not found in the current list (e.g., manually edited gsettings)
                    // Treat based on currentText: Add if valid and not present, remove UI row if empty.
                    if (currentText !== '' && !currentList.includes(currentText)) {
                        currentList.push(currentText);
                        wmClassRow._originalValue = currentText; // Start tracking the new value
                        listChanged = true;
                    } else if (currentText === '' && wmClassRow.get_parent() === this._group) {
                         // If original was not found and text is now empty, remove UI row
                         this._group.remove(wmClassRow);
                    }
                }
            } else {
                // Adding a new entry (originalValue was null or effectively empty)
                if (currentText !== '') {
                    if (!currentList.includes(currentText)) {
                        // Add new entry if not empty and not duplicate
                        currentList.push(currentText);
                        wmClassRow._originalValue = currentText; // Set original value now it's added
                        listChanged = true;
                    } else {
                        // Duplicate entry typed into a new row.
                        // Clear the text, leave the row for the user to try again or remove.
                        wmClassRow.set_text('');
                        wmClassRow._originalValue = null;
                        this._group.remove(wmClassRow); // Remove row
                        log(`Cannot add WM Class: "${currentText}" already exists in the list.`);
                    }
                } else {
                     // Apply clicked on a new, empty row - just remove it from UI
                     if (wmClassRow.get_parent() === this._group) {
                         this._group.remove(wmClassRow);
                     }
                }
            }

            // Save settings only if the list actually changed
            if (listChanged) {
                this.settings.set_strv(WM_CLASS_NOT_MAXIMIZE_KEY, currentList);
            }
        };

        wmClassRow.connect('apply', onApply);

        const removeButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Remove WM Class'),
            css_classes: ['flat'],
        });

        removeButton.connect('clicked', () => {
            const originalValue = wmClassRow._originalValue;
            let listChanged = false;

            // Only modify settings if there was an actual value associated with this row
            if (originalValue) {
                let currentList = this.settings.get_strv(WM_CLASS_NOT_MAXIMIZE_KEY);
                const index = currentList.indexOf(originalValue);
                if (index > -1) {
                    currentList.splice(index, 1);
                    this.settings.set_strv(WM_CLASS_NOT_MAXIMIZE_KEY, currentList);
                    this._group.remove(wmClassRow);
                    listChanged = true;
                }
            }
        });

        wmClassRow.add_suffix(removeButton);
        wmClassRow.set_focusable(true);

        this._group.add(wmClassRow);

        return wmClassRow;
    }
}
