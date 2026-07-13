"use client";
import RaceTrack from "./RaceTrack";
import HeartsPanel from "./HeartsPanel";

export default function BonusArcade({ role }) {
  return (
    <>
      <RaceTrack />
      <HeartsPanel role={role} />
      <p className="note">
        <b>This is still demo logic:</b> both mechanics run on local state that resets on refresh. Wiring them up for
        real means the race reads live task-completion timestamps and the manager PIN becomes a proper login tied to
        your team&apos;s accounts. See README → Next steps.
      </p>
    </>
  );
}
