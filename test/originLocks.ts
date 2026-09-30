export function installTestOriginLocks(): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, "locks");
  type PendingLock = {
    readonly mode: LockMode;
    readonly run: () => void;
  };
  const queue: PendingLock[] = [];
  let exclusiveActive = false;
  let sharedActive = 0;

  const release = (mode: LockMode) => {
    if (mode === "exclusive") exclusiveActive = false;
    else sharedActive -= 1;
    pump();
  };
  const start = (pending: PendingLock) => {
    if (pending.mode === "exclusive") exclusiveActive = true;
    else sharedActive += 1;
    pending.run();
  };
  const pump = () => {
    if (exclusiveActive) return;
    const first = queue[0];
    if (first === undefined) return;
    if (first.mode === "exclusive") {
      if (sharedActive === 0) start(queue.shift() ?? first);
      return;
    }
    while (queue[0]?.mode === "shared" && !exclusiveActive) {
      const next = queue.shift();
      if (next !== undefined) start(next);
    }
  };

  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: <T>(
        name: string,
        options: LockOptions,
        action: (lock: Lock | null) => Promise<T> | T,
      ) => {
        const mode = options.mode ?? "exclusive";
        const available =
          queue.length === 0 &&
          !exclusiveActive &&
          (mode === "shared" || sharedActive === 0);
        if (options.ifAvailable && !available) {
          return Promise.resolve(action(null));
        }
        return new Promise<T>((resolve, reject) => {
          queue.push({
            mode,
            run: () => {
              const lock = { name, mode } satisfies Lock;
              void Promise.resolve(action(lock))
                .then(resolve, reject)
                .finally(() => release(mode));
            },
          });
          pump();
        });
      },
    },
  });
  return () => {
    if (original) Object.defineProperty(navigator, "locks", original);
    else Reflect.deleteProperty(navigator, "locks");
  };
}
