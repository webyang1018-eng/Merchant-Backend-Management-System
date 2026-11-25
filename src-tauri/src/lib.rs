use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent, WindowEvent,
};

struct AppQuitState {
    quitting: AtomicBool,
}

fn show_and_focus_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn toggle_pet_window(app: &AppHandle) {
    if let Some(pet) = app.get_webview_window("pet") {
        match pet.is_visible() {
            Ok(true) => {
                let _ = pet.hide();
            }
            Ok(false) => {
                let _ = pet.show();
            }
            Err(_) => {}
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(AppQuitState {
            quitting: AtomicBool::new(false),
        })
        .setup(|app| {
            let show_main_item = MenuItem::with_id(app, "show_main", "Open Mercato Console", true, None::<&str>)?;
            let toggle_pet_item = MenuItem::with_id(app, "toggle_pet", "Toggle Desktop Pet", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Mercato", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_main_item, &toggle_pet_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("mercato-tray")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .tooltip("Mercato Merchant Console");

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_main" => show_and_focus_main(app),
                    "toggle_pet" => toggle_pet_window(app),
                    "quit" => {
                        app.state::<AppQuitState>()
                            .quitting
                            .store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_and_focus_main(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let quitting = window
                    .app_handle()
                    .state::<AppQuitState>()
                    .quitting
                    .load(Ordering::SeqCst);
                if !quitting && (window.label() == "main" || window.label() == "pet") {
                    // Keep `main` resident in background so MerchantContext remains the single source of truth
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Mercato Tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { api, .. } = event {
            let quitting = app_handle
                .state::<AppQuitState>()
                .quitting
                .load(Ordering::SeqCst);
            if !quitting {
                api.prevent_exit();
            }
        }
    });
}
