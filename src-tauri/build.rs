// use embed_manifest::embed_manifest_file;

fn main() {
    // tauri::build();

    if cfg!(debug_assertions) {
        println!("DEV BUILD");
        tauri_build::build();
    } else {
        // embed_manifest_file("manifest").expect("Failed to embed manifest file");

        let mut windows = tauri_build::WindowsAttributes::new();
        windows = windows.app_manifest(
        r#"<assembly xmlns="urn:schemas-microsoft-com:asm.v1" xmlns:asmv3="urn:schemas-microsoft-com:asm.v3" manifestVersion="1.0">
                <dependency>
                    <dependentAssembly>
                        <assemblyIdentity
                        type="win32"
                        name="Microsoft.Windows.Common-Controls"
                        version="6.0.0.0"
                        processorArchitecture="*"
                        publicKeyToken="6595b64144ccf1df"
                        language="*"
                        />
                    </dependentAssembly>
                </dependency>
            </assembly>
        "#,
    );
        // [manifest]: https://learn.microsoft.com/en-us/windows/win32/sbscs/application-manifests

        tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
            .expect("failed to run build script");
    };
}
