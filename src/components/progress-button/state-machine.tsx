import { assign, setup } from "xstate";

const progressButtonMachine = setup({
  types: {
    context: {} as {
      download_progress: number;
      extract_progress: number;
    },
    events: {} as { type: "click" } | { type: "complete" } | { type: "setProgress"; progress: number },
  },
}).createMachine({
  context: {
    download_progress: 0,
    extract_progress: 0,
  },
  id: "progressButton",
  initial: "idle",

  states: {
    idle: {
      on: { click: "inDownloadProgress" },
    },
    inDownloadProgress: {
      on: {
        setProgress: {
          actions: assign(({ event }) => {
            return {
              download_progress: event.progress,
            };
          }),
        },
        complete: "inExtractProgress",
      },
    },
    inExtractProgress: {
      on: {
        setProgress: {
          actions: assign(({ event }) => {
            return {
              extract_progress: event.progress,
            };
          }),
        },
        complete: "success",
      },
    },
    success: {
      // after: {
      //   1500: "successFadeOut", // Transition to 'successFadeOut' after x ms
      // },
    },
    successFadeOut: {
      // after: {
      //   10: "idle", // Transition to 'idle' after x ms
      // },
    },
  },
});

export { progressButtonMachine };
