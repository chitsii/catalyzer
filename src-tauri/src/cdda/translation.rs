mod commands {
    use crate::prelude::*;

    fn run_python_module(module_name: &str, args: Option<String>) -> Result<String> {
        let mut cmd = std::process::Command::new("python3");
        cmd.arg("-m").arg(module_name);
        if let Some(args) = args {
            cmd.arg(args);
        }
        let output = cmd.output().unwrap();
        let output = String::from_utf8(output.stdout).unwrap();
        Ok(output)
    }

    fn extract_json_string(output_path: PathBuf) -> Result<String> {
        run_python_module(
            "extract_json_string",
            Some(format!("--output '{}'", output_path.to_string_lossy())),
        )
    }
}

// mod_directory_path: PathBuf,
// create_dir_all {mod_dir_path}/lang/po/
// python3 extract_json_strings.py --include_dir {mod_dir_path} --output {mod_directory_path}/lang/po/translation.pot
// msginit -o mods/demo/lang/po/ru.po -i mods/demo/lang/po/translation.pot -l ru
// 翻訳
// mkdir -p mods/demo/lang/mo/ru/LC_MESSAGES/
// msgfmt -o mods/demo/lang/mo/ru/LC_MESSAGES/demo.mo mods/demo/lang/po/ru.po
