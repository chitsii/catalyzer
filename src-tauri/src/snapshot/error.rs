use thiserror::Error;

#[derive(Error, Debug)]
pub enum SnapshotError {
    #[error("スナップショットが見つかりません: {0}")]
    NotFound(String),
    #[error("スナップショット名が重複しています: {0}")]
    DuplicateName(String),
    #[error("アクティブなスナップショットは削除できません")]
    CannotDeleteActive,
    #[error("I/Oエラー: {0}")]
    Io(#[from] std::io::Error),
    #[error("YAMLパースエラー: {0}")]
    Yaml(#[from] serde_yaml::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = SnapshotError::NotFound("test".into());
        assert!(err.to_string().contains("test"));
    }

    #[test]
    fn test_error_duplicate_name() {
        let err = SnapshotError::DuplicateName("my_snapshot".into());
        assert!(err.to_string().contains("my_snapshot"));
        assert!(err.to_string().contains("重複"));
    }

    #[test]
    fn test_error_cannot_delete_active() {
        let err = SnapshotError::CannotDeleteActive;
        assert!(err.to_string().contains("アクティブ"));
    }

    #[test]
    fn test_error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err: SnapshotError = io_err.into();
        assert!(matches!(err, SnapshotError::Io(_)));
    }
}
