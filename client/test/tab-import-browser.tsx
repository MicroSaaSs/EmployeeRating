/** Interactive browser regression harness. Synthetic pixels only; never bundled into the app. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LinkedInTabImport from "../src/components/LinkedInTabImport";

const nativeZoom = typeof (window as any).CaptureController?.prototype.decreaseZoomLevel === "function";
class SyntheticController extends EventTarget {
  zoomLevel = 100;
  getSupportedZoomLevels() { return [50, 75, 100, 125]; }
  async decreaseZoomLevel() { this.zoomLevel = this.getSupportedZoomLevels().filter(value => value < this.zoomLevel).at(-1)!; this.dispatchEvent(new Event("zoomlevelchange")); }
  async increaseZoomLevel() { this.zoomLevel = this.getSupportedZoomLevels().find(value => value > this.zoomLevel)!; this.dispatchEvent(new Event("zoomlevelchange")); }
  async resetZoomLevel() { this.zoomLevel = 100; this.dispatchEvent(new Event("zoomlevelchange")); }
  setFocusBehavior(behavior: string) { focusBehavior = behavior; }
  private target: HTMLElement | null = null;
  private wheel = (event: WheelEvent) => {
    if (!event.isTrusted || activeTrack?.readyState !== "live") return;
    forwardedWheels++;
    if (event.deltaY > 0) nextView(); else draw();
  };
  async forwardWheel(element: HTMLElement | null) {
    this.target?.removeEventListener("wheel", this.wheel);
    this.target = element;
    this.target?.addEventListener("wheel", this.wheel);
  }
}
Object.defineProperty(window, "CaptureController", { configurable: true, value: SyntheticController });

const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 760;
const context = canvas.getContext("2d")!;
let activeTrack: MediaStreamTrack | undefined;
let reads = 0;
let forwardedWheels = 0;
let focusBehavior = "";
const fixture = new Image();
fixture.src = "/__tab-test/experience.svg";
await fixture.decode();
function draw() { context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(fixture, 0, 0); }
function nextView() { draw(); context.fillStyle = "white"; context.fillRect(50, 120, 1090, 410); context.fillStyle = "#172635"; context.font = "bold 30px Arial"; context.fillText("Team Lead", 65, 170); context.font = "28px Arial"; context.fillText("Third Company", 65, 218); context.fillText("Jan 2015 - Dec 2017", 65, 266); }
draw();
// Canvas capture publishes a frame when painted; keep unchanged frames flowing like a real tab.
setInterval(() => { context.fillStyle = "white"; context.fillRect(1198, 758, 1, 1); }, 250);
Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", { configurable: true, value: async () => {
  const stream = canvas.captureStream(10);
  const track = stream.getVideoTracks()[0]; activeTrack = track;
  Object.defineProperty(track, "getSettings", { value: () => ({ displaySurface: "browser" }) });
  Object.defineProperty(track, "label", { value: "Sample Experience (test pixels)" });
  reads++;
  return stream;
} });
// Exercise step ordering without navigating to a real third-party test profile.
document.addEventListener("click", event => { if ((event.target as HTMLElement).closest('a[target="_blank"]')) event.preventDefault(); });
function Harness() {
  const [result, setResult] = useState("");
  const [trackStatus, setTrackStatus] = useState("");
  return <main className="mx-auto max-w-3xl p-6">
    <h1 className="text-xl font-bold">Import regression — synthetic shared tab</h1>
    <p className="text-sm">Test-only: the picker is replaced with a generated canvas stream. No real browser tab is captured.</p>
    <p className="text-xs">Native captured-tab zoom API: {nativeZoom ? "available" : "unavailable"}. Zoom actions in this harness are simulated.</p>
    <div className="my-3 flex gap-2">
      <button className="pilot-button-secondary" onClick={nextView}>Show next Experience view</button>
      <button className="pilot-button-secondary" onClick={() => setTrackStatus(`Shares: ${reads}; track: ${activeTrack?.readyState}; forwarded scrolls: ${forwardedWheels}; focus: ${focusBehavior}`)}>Check track</button>
      <button className="pilot-button-secondary" onClick={() => activeTrack?.dispatchEvent(new Event("ended"))}>Browser stops sharing</button>
    </div>
    <p role="note">{trackStatus}</p>
    <LinkedInTabImport url="https://www.linkedin.com/in/example/" disabled={false} onImported={profile => setResult(JSON.stringify(profile, null, 2))} />
    <pre aria-label="Review handoff result">{result}</pre>
  </main>;
}
createRoot(document.querySelector("#root")!).render(<Harness />);
