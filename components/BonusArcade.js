"use client";
import RaceTrack from "./RaceTrack";
import HeartsPanel from "./HeartsPanel";

export default function BonusArcade({ role, items }) {
  return (
    <>
      <RaceTrack items={items} />
      <HeartsPanel role={role} />
      <p className="note">
        <b>Still demo logic:</b> Quality Hearts still runs on local state that resets on refresh — wiring uploader
        reviews to real data is a follow-up (needs a review-tracking table). Speed Race above is live.
      </p>
    </>
  );
}
