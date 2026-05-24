const SESSION_HOURS = 8;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;

/** Wall-clock length for 8h of simulated time while demo fast-forward is on. */
export const DEMO_FULL_SESSION_SECONDS = 60;

/** How much faster simulated `appNow` advances vs wall clock in demo mode. */
export const DEMO_TIME_SPEED_MULTIPLIER =
  SESSION_MS / (DEMO_FULL_SESSION_SECONDS * 1000);
