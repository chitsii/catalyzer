use crate::prelude::*;

use std::fs::File;
use std::io::{BufReader, BufWriter};
use zifu_core::filename_decoder;
use zifu_core::InputZIPArchive;

/// Fix the encoding of file names in a ZIP archive and write the fixed archive to the output path.
/// args:
///    file_path: The path to the input ZIP archive.
///   output_zip_path: The path to the output ZIP archive.
/// returns:
///   The path to the output ZIP archive.
/// errors:
///  If the input ZIP archive is not a supported type, or if the encoding of the file names in the
/// input ZIP archive cannot be detected, an error is returned.
pub fn fix_zip_fname_encoding(file_path: String, output_zip_path: String) -> Result<String> {
    let bufr = BufReader::new(File::open(file_path)?);

    let mut input_zip_file = InputZIPArchive::new(bufr)?;
    input_zip_file.check_unsupported_zip_type()?;

    let legacy_decoder = <dyn filename_decoder::IDecoder>::native_oem_encoding();
    let sjis_decoder = <dyn filename_decoder::IDecoder>::from_encoding_name("sjis").unwrap();
    let utf8_decoder = <dyn filename_decoder::IDecoder>::utf8();
    let ascii_decoder = <dyn filename_decoder::IDecoder>::ascii();

    let decoders_list = vec![
        &*ascii_decoder,
        &*sjis_decoder,
        &*legacy_decoder,
        &*utf8_decoder,
    ];

    // Detect encoding by trying decoding all of file names and comments
    let best_fit_decoder_index_ = input_zip_file.get_filename_decoder_index(&decoders_list);
    match best_fit_decoder_index_ {
        Some(index) => {
            debug!(
                "Detected encoding: {:?}",
                decoders_list[index].encoding_name()
            );
            let guessed_encoder = decoders_list[index];
            input_zip_file.convert_central_directory_file_names(guessed_encoder);
            let mut output_zip_file = BufWriter::new(File::create(&output_zip_path)?);
            input_zip_file
                .output_archive_with_central_directory_file_names(&mut output_zip_file)?;
            Ok(output_zip_path)
        }
        None => Err(anyhow::anyhow!("Failed to detect encoding.")),
    }
}
