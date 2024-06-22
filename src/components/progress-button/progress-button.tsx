import { useEffect } from "react";
import { useMachine } from "@xstate/react";
import { progressButtonMachine } from "@/components/progress-button/state-machine";
import { Check, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ProgressButtonBaseProps = {
  successColorClass?: string;
  onClick?: () => void;
  // onComplete?: () => void;
  onCompleteDownload: () => void;
  onCompleteExtract: () => void;
  onError?: (error: Error) => void;
};

type ManualProgressButtonProps = ProgressButtonBaseProps & {
  progressType?: "manual";
  download_progress: number;
  extract_progress: number;
  duration?: never;
  totalDuration?: never;
  numberOfProgressSteps?: never;
  label: string;
};

type ProgressButtonProps = ManualProgressButtonProps; // | AutomaticProgressButtonProps;

const ProgressButton = (props: ProgressButtonProps) => {
  const {
    progressType = "automatic",
    successColorClass,
    onClick,
    onCompleteDownload,
    onCompleteExtract,
    onError,
    download_progress: download_progress,
    extract_progress: extract_progress,
    label,
  } = props;

  const [state, send] = useMachine(progressButtonMachine);

  useEffect(() => {
    if (download_progress) {
      send({ type: "setProgress", progress: download_progress });
      if (download_progress >= 100) {
        setTimeout(() => {
          try {
            send({ type: "setProgress", progress: 0 });
            send({ type: "complete" });
            handleCompleteDownload();
          } catch (e: any) {
            handleError(e);
          }
        }, 1000);
      }
    }
  }, [download_progress, send]);

  useEffect(() => {
    if (extract_progress) {
      send({ type: "setProgress", progress: extract_progress });
      if (extract_progress >= 100) {
        setTimeout(() => {
          try {
            send({ type: "setProgress", progress: 0 });
            send({ type: "complete" });
            handleCompleteExtract();
          } catch (e: any) {
            handleError(e);
          }
        }, 1000);
      }
    }
  }, [extract_progress, send]);

  const isManualDownloadComplete = () => progressType === "manual" && state.context.download_progress >= 100;
  const isManualExtractComplete = () => progressType === "manual" && state.context.extract_progress >= 100;

  useEffect(() => {
    if (isManualDownloadComplete()) {
      handleCompleteDownload();
    }
    if (isManualExtractComplete()) {
      handleCompleteExtract();
    }
  }, [state.value]);

  const handleClick = () => {
    send({ type: "click" });
    onClick?.();
  };

  const handleCompleteDownload = () => {
    send({ type: "complete" });
    onCompleteDownload?.();
  };
  const handleCompleteExtract = () => {
    send({ type: "complete" });
    onCompleteExtract?.();
  };

  const handleError = (error: Error) => {
    onError?.(error);
  };

  const prefixIcon = <File className="h-3.5 w-3.5" />;
  const buttonLabel = <span className="sm:whitespace-nowrap">{label}</span>;
  const progressBarDL = <Progress value={state.context.download_progress} className="w-[60px] h-[10px]" />;
  const progressBarExt = <Progress value={state.context.extract_progress} className="w-[60px] h-[10px]" />;
  const successIcon = <Check className="h-5 w-5" />;

  const bgColor = `[&>*>*]:bg-${successColorClass}`;
  const bgColorClassDL = () => {
    if (!successColorClass || state.context.download_progress < 100) return "[&>*>*]:bg-primary-900";
    if (state.context.download_progress >= 100) {
      return bgColor;
    }
  };
  const bgColorClassExt = () => {
    if (!successColorClass || state.context.extract_progress < 100) return "[&>*>*]:bg-primary-900";
    if (state.context.extract_progress >= 100) {
      return bgColor;
    }
  };

  return (
    <>
      <div className="flex flex-col justify-center items-center h-full">
        <Button
          variant="outline"
          className={`w-[250px] h-7 gap-1 group ${!state.matches("idle") ? "pointer-events-none" : ""}`}
          onClick={handleClick}
        >
          {state.matches("idle") && (
            <span className="flex gap-1 items-center animate-in fade-in zoom-in spin-in">
              <span className="transition-all duration-200 group-hover:-rotate-12">{prefixIcon}</span>
              {buttonLabel}
            </span>
          )}
          {state.matches("inDownloadProgress") && (
            <span className={`transition-color animate-in fade-in zoom-in absolute`}>
              <span className={bgColorClassDL()}>{progressBarDL}</span>
            </span>
          )}
          {state.matches("inExtractProgress") && (
            <span className={`transition-color animate-in fade-in zoom-in absolute`}>
              <span className={bgColorClassExt()}>{progressBarExt}</span>
            </span>
          )}
          {state.matches("success") && <span className="animate-in fade-in zoom-in spin-in">{successIcon}</span>}
          {state.matches("successFadeOut") && <span className="animate-out fade-out zoom-out">{successIcon}</span>}
        </Button>
      </div>
    </>
  );
};

export default ProgressButton;
