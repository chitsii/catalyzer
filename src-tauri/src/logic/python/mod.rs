use crate::prelude::*;
// use anyhow::Context;
use tauri::api::process::{Command, CommandEvent};

pub fn run_python() -> Result<()> {
    // `new_sidecar()` expects just the filename, NOT the whole path like in JavaScript
    let (mut rx, _child) = Command::new_sidecar("rustpython")
        .map_err(|e| anyhow::anyhow!(e))
        .with_context(|| "failed to create `rustpython` binary command")
        .unwrap()
        .args([
            "-c",
            "print('Hello from RustPython!');print('Hello from RustPython2!')",
        ])
        .spawn()
        .with_context(|| "Failed to spawn sidecar")
        .unwrap();

    debug!("run_python invoked.");

    tauri::async_runtime::spawn(async move {
        // read events such as stdout
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                debug!("process stdout: {:?}", line);
            }
        }
    });

    debug!("run_python finished.");
    Ok(())
}
