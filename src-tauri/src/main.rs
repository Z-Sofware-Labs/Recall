// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  #[cfg(target_os = "linux")]
  {
    // Mitigates known WebKitGTK (2.40+) window resize, minimize, maximize, and restore
    // lag/stutter caused by DMA-BUF surface re-negotiation on Wayland and X11 compositors.
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
      std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
  }

  recall_lib::run();
}
