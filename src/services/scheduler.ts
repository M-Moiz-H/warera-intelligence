import type { WarEraProvider } from "../warera/provider.js";
import { env } from "../config/env.js";
import { syncCore } from "./sync-service.js";
import {
  captureSnapshots
} from "./snapshot-service.js";

export function startScheduler(
  provider: WarEraProvider
) {
  let running = false;

  const tick = async () => {
    if (running) {
      console.warn(
        "⏳ Scheduler tick skipped because the previous cycle is still running."
      );

      return;
    }

    running = true;

    try {
      console.log(
        "🔄 Starting WarEra intelligence cycle..."
      );

      const syncResult =
        await syncCore(provider);

      console.log(
        "[sync]",
        syncResult
      );

      const snapshotResult =
        await captureSnapshots(provider);

      console.log(
        "[snapshots]",
        snapshotResult
      );

      if (
        snapshotResult.errors.length > 0
      ) {
        console.warn(
          "⚠️ Historical snapshots completed with warnings:",
          snapshotResult.errors
        );
      }
    } catch (error) {
      console.error(
        "❌ Scheduler cycle failed:",
        error
      );
    } finally {
      running = false;
    }
  };

  void tick();

  return setInterval(
    () => void tick(),
    env.syncIntervalSeconds * 1000
  );
}
