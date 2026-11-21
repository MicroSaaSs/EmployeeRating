import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Worker } from "tesseract.js";
import { message } from "../utils/api";
import { captureChanged, capturedRoleKey, createTabCaptureController, fullCaptureArea, linkedInTabUrl, mergeCapturedRoles, parseLinkedInScreenText, requireSharedTab, stopSharedTab,
  type CapturedRole, type CaptureArea, type TabCaptureController } from "../utils/linkedinTabCapture";

export interface LinkedInTabProfile { linkedinProfileUrl: string; positions: CapturedRole[] }

export default function LinkedInTabImport({ url, disabled, onImported, subject = "self", compact = false }: {
  url: string; disabled: boolean; onImported: (profile: LinkedInTabProfile) => void; subject?: "self" | "colleague"; compact?: boolean;
}) {
  const supported = typeof navigator.mediaDevices?.getDisplayMedia === "function";
  let profile = "";
  try { profile = linkedInTabUrl(url); } catch { /* The open action explains invalid links. */ }
  const experienceUrl = profile ? profile + "details/experience/" : "https://www.linkedin.com/me/";
  const [openedProfile, setOpenedProfile] = useState("");
  const [sharing, setSharing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [roles, setRoles] = useState<CapturedRole[]>([]);
  const [recognizedText, setRecognizedText] = useState("");
  const [area, setArea] = useState<CaptureArea>(fullCaptureArea);
  const [areaChosen, setAreaChosen] = useState(false);
  const [sharedName, setSharedName] = useState("");
  const [language, setLanguage] = useState<"eng" | "eng+rus">("eng");
  const [mode, setMode] = useState<"single" | "scroll">("scroll");
  const [zoom, setZoom] = useState<{ current: number; min: number; max: number }>();
  const [zooming, setZooming] = useState(false);
  const [previewScroll, setPreviewScroll] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(false);
  const [scrollSupported, setScrollSupported] = useState(false);
  const [readingIssues, setReadingIssues] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const previewSurface = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | undefined>(undefined);
  const worker = useRef<Worker | undefined>(undefined);
  const controller = useRef<TabCaptureController | undefined>(undefined);
  const generation = useRef(0);
  const mounted = useRef(false);
  const looping = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<{ x: number; y: number } | undefined>(undefined);
  const sourceUrl = useRef("");
  const group = useRef("");
  const frames = useRef(0);
  const rolesRef = useRef<CapturedRole[]>([]);
  const discarded = useRef(new Set<string>());
  const lastFrameKeys = useRef(new Set<string>());
  const lastGroupBefore = useRef("");
  const lastSample = useRef<Uint8Array | undefined>(undefined);
  const lastRead = useRef<Uint8Array | undefined>(undefined);

  function updateRoles(next: CapturedRole[]) { rolesRef.current = next; setRoles(next); }

  function release() {
    generation.current++;
    looping.current = false;
    clearTimeout(timer.current);
    clearTimeout(expiry.current);
    if (previewSurface.current) previewSurface.current.removeEventListener("wheel", preventPageScroll);
    stopSharedTab(stream.current);
    stream.current = undefined;
    controller.current = undefined;
    if (video.current) video.current.srcObject = null;
    const previous = worker.current;
    worker.current = undefined;
    if (previous) void previous.terminate().catch(() => undefined);
  }

  function stop(notice = "Reading stopped. Review the captured roles below. Nothing has been saved.") {
    release();
    if (mounted.current) {
      setSharing(false); setRequesting(false); setRunning(false); setZoom(undefined); setZooming(false);
      setPreviewScroll(false); setScrollRequest(false); setScrollSupported(false);
      setStatus(notice);
    }
  }

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; release(); };
  }, []);

  useEffect(() => {
    if (stream.current && profile !== sourceUrl.current) stop("Sharing stopped because the profile link changed. Review or clear the captured roles before importing another profile.");
  }, [profile]);

  useEffect(() => {
    if (!sharing || !video.current || !stream.current) return;
    video.current.srcObject = stream.current;
    void video.current.play().catch(() => {
      stop();
      setError("The tab preview could not start. Share the LinkedIn tab again in desktop Chrome or Edge.");
    });
  }, [sharing]);

  function openProfile(event: MouseEvent<HTMLAnchorElement>) {
    try {
      const selectedProfile = linkedInTabUrl(url);
      event.currentTarget.href = selectedProfile + "details/experience/";
      setOpenedProfile(selectedProfile); setError("");
    } catch (failure) { event.preventDefault(); setError(message(failure)); }
  }

  async function share() {
    setError("");
    if (!supported) { setError("Open E-ProRate in desktop Chrome or Edge to share a browser tab."); return; }
    if (!profile || openedProfile !== profile) return;
    if (roles.length && sourceUrl.current && sourceUrl.current !== profile) {
      setError("Review or clear the previously captured roles before changing the profile link.");
      return;
    }
    release();
    const current = generation.current;
    setRequesting(true);
    try {
      const captureController = createTabCaptureController(window as typeof window & { CaptureController?: new () => TabCaptureController });
      // The native chooser must run directly in the user's click handler.
      const selected = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" }, audio: false,
        selfBrowserSurface: "exclude", monitorTypeSurfaces: "exclude", surfaceSwitching: "exclude",
        ...(captureController ? { controller: captureController } : {}),
      } as DisplayMediaStreamOptions);
      // Keep the participant in E-ProRate after choosing the source tab, when supported.
      try { captureController?.setFocusBehavior?.("no-focus-change"); } catch { /* Optional browser feature. */ }
      if (!mounted.current || current !== generation.current) { stopSharedTab(selected); return; }
      const track = requireSharedTab(selected);
      stream.current = selected;
      controller.current = captureController;
      setScrollSupported(typeof captureController?.forwardWheel === "function");
      if (captureController) {
        const updateZoom = () => {
          if (!mounted.current || current !== generation.current) return;
          try {
            const levels = captureController.getSupportedZoomLevels();
            const level = captureController.zoomLevel;
            setZoom(level != null && levels.length ? { current: level, min: levels[0], max: levels[levels.length - 1] } : undefined);
          } catch { setZoom(undefined); }
        };
        updateZoom();
        captureController.addEventListener("zoomlevelchange", () => {
          updateZoom();
          if (current === generation.current && !looping.current) { setArea(fullCaptureArea); setAreaChosen(false); }
        });
      }
      if (sourceUrl.current && sourceUrl.current !== profile) clearDrafts();
      sourceUrl.current = profile;
      frames.current = 0; lastSample.current = undefined; lastRead.current = undefined;
      track.addEventListener("ended", () => stop(), { once: true });
      setSharedName(!track.label || /^[\w-]+:\/\//.test(track.label) ? "Selected browser tab" : track.label);
      setArea(fullCaptureArea); setAreaChosen(false); setSharing(true); setStatus("");
      expiry.current = setTimeout(() => stop("Sharing stopped after 5 minutes. Review the captured roles below, or share the tab again to continue."), 5 * 60 * 1000);
    } catch (failure) {
      if (!mounted.current || current !== generation.current) return;
      if (failure instanceof DOMException && (failure.name === "NotAllowedError" || failure.name === "AbortError")) {
        setError("Tab sharing was cancelled or blocked. Try again and choose the LinkedIn tab in the browser prompt.");
      } else setError(message(failure));
    } finally { if (mounted.current && current === generation.current) setRequesting(false); }
  }

  function addText(text: string, replaceLast = false) {
    if (!replaceLast) lastGroupBefore.current = group.current;
    const result = parseLinkedInScreenText(text, lastGroupBefore.current);
    group.current = result.group;
    const incoming = result.roles.filter(role => !discarded.current.has(capturedRoleKey(role)));
    const replaced = replaceLast ? lastFrameKeys.current : new Set<string>();
    const merged = mergeCapturedRoles(rolesRef.current, incoming, replaced);
    lastFrameKeys.current = new Set(incoming.map(capturedRoleKey));
    updateRoles(merged);
  }

  function clearDrafts() {
    updateRoles([]); setRecognizedText(""); setReadingIssues(""); group.current = ""; lastGroupBefore.current = "";
    lastFrameKeys.current.clear(); discarded.current.clear(); frames.current = 0; lastRead.current = undefined;
  }

  function preventPageScroll(event: WheelEvent) { event.preventDefault(); }

  async function enablePreviewScroll() {
    const target = controller.current;
    const element = previewSurface.current;
    if (!target?.forwardWheel || !element || scrollRequest) return false;
    const current = generation.current;
    setScrollRequest(true); setError("");
    try {
      await target.forwardWheel(element);
      if (!mounted.current || current !== generation.current) return false;
      element.addEventListener("wheel", preventPageScroll, { passive: false });
      setPreviewScroll(true);
      return true;
    } catch {
      if (mounted.current && current === generation.current) setError("Preview scrolling was not allowed. Allow control of the shared tab in the browser prompt, or use Chrome to try again.");
      return false;
    } finally { if (mounted.current && current === generation.current) setScrollRequest(false); }
  }

  async function beginReading() {
    if (mode === "scroll" && scrollSupported && !previewScroll && !await enablePreviewScroll()) return;
    startReading();
  }

  async function changeZoom(action: "decrease" | "increase" | "reset") {
    const target = controller.current;
    if (!target || looping.current || zooming) return;
    const current = generation.current;
    setZooming(true); setError("");
    try {
      // These calls intentionally stay in the click handler. Chrome owns the permission prompt.
      await (action === "decrease" ? target.decreaseZoomLevel() : action === "increase" ? target.increaseZoomLevel() : target.resetZoomLevel());
      if (!mounted.current || current !== generation.current) return;
      const levels = target.getSupportedZoomLevels();
      if (target.zoomLevel != null && levels.length) setZoom({ current: target.zoomLevel, min: levels[0], max: levels[levels.length - 1] });
      setArea(fullCaptureArea); setAreaChosen(false);
      setStatus("LinkedIn zoom updated. Select the text area again. Use one view only if all the roles you want are visible and readable.");
    } catch {
      if (mounted.current && current === generation.current) setError("The browser did not allow zoom control. You can change zoom directly in your LinkedIn tab, then return here.");
    } finally { if (mounted.current && current === generation.current) setZooming(false); }
  }

  function startReading() {
    if (!areaChosen || !stream.current || looping.current || disabled || zooming) return;
    looping.current = true; setRunning(true); setError("");
    lastSample.current = undefined;
    const current = generation.current;
    const startedAt = Date.now();
    const readingArea = { ...area };
    const readingLanguage = language;
    const singleView = mode === "single";
    const summary = () => `${rolesRef.current.length} draft ${rolesRef.current.length === 1 ? "role" : "roles"} found. ` + (singleView ? "Reading this visible view once. Keep the page still; sharing will stop automatically." : "Scroll inside the preview, pausing at each section. Select Stop and review when finished.");
    setStatus(summary());

    async function tick() {
      if (!looping.current || current !== generation.current || !mounted.current) return;
      let canvas: HTMLCanvasElement | undefined;
      try {
        const view = video.current;
        if (!view || !view.videoWidth || !view.videoHeight || view.readyState < 2) {
          if (Date.now() - startedAt > 15000) throw new Error("No preview frames received.");
          setStatus("Waiting for the shared tab preview. Keep the LinkedIn tab open.");
          return;
        }
        canvas = document.createElement("canvas");
        const cropWidth = Math.max(1, Math.round(view.videoWidth * readingArea.width));
        const cropHeight = Math.max(1, Math.round(view.videoHeight * readingArea.height));
        const scale = Math.min(2, 2400 / cropWidth, Math.sqrt(5000000 / (cropWidth * cropHeight)));
        canvas.width = Math.round(cropWidth * scale); canvas.height = Math.round(cropHeight * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser could not prepare the captured image.");
        context.drawImage(view, Math.round(view.videoWidth * readingArea.x), Math.round(view.videoHeight * readingArea.y), cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
        const sample = document.createElement("canvas"); sample.width = 96; sample.height = 64;
        const sampling = sample.getContext("2d", { willReadFrequently: true });
        if (!sampling) throw new Error("This browser could not prepare the captured image.");
        sampling.drawImage(canvas, 0, 0, 96, 64);
        const pixels = sampling.getImageData(0, 0, 96, 64).data;
        const signature = Uint8Array.from({ length: 96 * 64 }, (_, index) => Math.round((pixels[index * 4] + pixels[index * 4 + 1] + pixels[index * 4 + 2]) / 3));
        sample.width = 0; sample.height = 0;
        const moving = captureChanged(lastSample.current, signature);
        lastSample.current = signature;
        if (moving) { setStatus("Waiting for the page to settle… " + summary()); return; }
        if (!captureChanged(lastRead.current, signature)) { setStatus(summary()); return; }
        if (!worker.current) {
          const { createTabOcrWorker } = await import("../utils/tabOcr");
          if (!mounted.current || current !== generation.current) return;
          const created = await createTabOcrWorker(value => { if (mounted.current && generation.current === current) setStatus(value); }, readingLanguage);
          if (!mounted.current || generation.current !== current) { await created.terminate(); return; }
          worker.current = created;
        }
        const { recognizeLinkedInView } = await import("../utils/tabOcr");
        const result = await recognizeLinkedInView(worker.current, canvas, () => mounted.current && current === generation.current, group.current);
        if (!mounted.current || current !== generation.current) return;
        if (!result) return;
        lastGroupBefore.current = group.current; group.current = result.group;
        const incoming = result.roles.filter(role => !discarded.current.has(capturedRoleKey(role)));
        lastFrameKeys.current = new Set(incoming.map(capturedRoleKey));
        updateRoles(mergeCapturedRoles(rolesRef.current, incoming));
        setRecognizedText(result.text);
        setReadingIssues(result.skipped ? "A job header is cut off or its date is unreadable in this view. Scroll slightly and pause to show the full title, company and date together." : result.unclear ? "Some dated roles could not be read clearly. They are kept for review. Use 100% zoom and read overlapping views for better results." : "");
        lastRead.current = signature; frames.current++;
        setStatus(summary());
        if (singleView) stop(rolesRef.current.length ? "This view has been read and sharing has stopped. Review the captured roles below." : "This view has been read and sharing has stopped. No clear roles were found. Try a larger zoom or import a saved file.");
        else if (frames.current >= 30) stop("Reading finished after 30 different views. Review the captured roles below, or share again to read more.");
      } catch {
        if (mounted.current && current === generation.current) {
          stop("Reading stopped. Any roles already captured are ready for review.");
          setError("Text recognition could not finish. Share the tab again to retry. Your saved work history has not changed.");
        }
      } finally {
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        if (mounted.current && current === generation.current && looping.current) timer.current = setTimeout(() => void tick(), 1000);
      }
    }
    void tick();
  }

  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }

  const opened = !!profile && openedProfile === profile;
  const Settings = compact ? "details" : "div";
  return <div className="mt-4 space-y-4">
    <ol className="space-y-3" aria-label="LinkedIn import steps">
      {(!compact || (!opened && supported)) &&
      <li className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">1. Open {subject === "colleague" ? "their" : "your"} Experience page</p>
        <p className="mt-1 text-xs text-slate-600">Open LinkedIn, then return here to share that tab.</p>
        <a className={"pilot-button-secondary mt-2" + (sharing || requesting ? " pointer-events-none opacity-50" : "")} href={experienceUrl} target="_blank" rel="noopener noreferrer" aria-disabled={sharing || requesting} tabIndex={sharing || requesting ? -1 : 0} onClick={event => { if (sharing || requesting) event.preventDefault(); else openProfile(event); }}>Open LinkedIn Experience</a>
      </li>}
      {(!compact || (opened && !sharing && supported)) &&
      <li className={"rounded-lg border border-border p-3" + (!opened ? " bg-slate-50" : "")}>
        <p className="text-sm font-semibold">2. Share the LinkedIn tab</p>
        <p className="mt-1 text-xs text-slate-600">{!opened ? "Complete step 1 to continue." : sharing ? "Tab connected. Continue to step 3." : "Choose your LinkedIn Experience tab in the browser prompt."}</p>
        {!sharing && <button type="button" className="pilot-button mt-2" disabled={disabled || requesting || !supported || !opened} onClick={() => void share()}>{requesting ? "Choose the LinkedIn tab…" : "Share LinkedIn tab"}</button>}
        {compact && !requesting && <a className="pilot-link ml-3 text-sm" href={experienceUrl} target="_blank" rel="noopener noreferrer" onClick={openProfile}>Reopen Experience</a>}
        {sharing && !running && <button type="button" className="pilot-link mt-2 text-xs" onClick={() => stop("Sharing cancelled. Your saved work history has not changed.")}>Cancel sharing</button>}
      </li>}
      {(!compact || sharing) &&
      <li className={"rounded-lg border border-border p-3" + (!sharing ? " bg-slate-50" : "")}>
        <div className={"flex flex-wrap items-center justify-between gap-2" + (running ? " sticky top-3 z-10 bg-white py-2" : "")}>
          <p className="text-sm font-semibold">3. {running ? "Reading LinkedIn Experience" : subject === "colleague" ? "Read their work history" : "Read your work history"}</p>
          {running && <button type="button" className="pilot-button" onClick={() => stop()}>Stop and review</button>}
        </div>
        {!sharing && <p className="mt-1 text-xs text-slate-600">{roles.length ? "Reading has stopped. Your draft roles are ready below." : "Share your tab in step 2 to continue."}</p>}
        {sharing && <div className="mt-3 space-y-3">
          <p className="break-all text-xs text-slate-600">Sharing: {sharedName}</p>
          {!running && <>
            <p className="text-sm">Drag around the <strong>job titles, companies and dates</strong> in the preview. Exclude logos, the top navigation and the sidebar.</p>
            {compact && <button type="button" className="pilot-link text-xs" onClick={() => stop("Sharing cancelled.")}>Cancel sharing</button>}
            <Settings className="space-y-3 rounded-lg bg-slate-50 p-3">
              {compact && <summary className="cursor-pointer text-sm font-medium">Capture settings</summary>}
            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium">Keep the text readable</p>
              <p className="text-xs text-slate-600">100% zoom is recommended. Read several overlapping views by scrolling here instead of shrinking the whole page.</p>
              {zoom && zoom.current < 85 && <p className="text-sm font-medium text-amber-900">At {zoom.current}%, job titles or dates may be missed. Reset to 100% for better recognition.</p>}
              {zoom ? <>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="pilot-button-secondary" disabled={zooming || zoom.current <= zoom.min} onClick={() => void changeZoom("decrease")}>Zoom LinkedIn out</button>
                  <span className="text-sm tabular-nums" aria-label="LinkedIn tab zoom">{zoom.current}%</span>
                  <button type="button" className="pilot-button-secondary" disabled={zooming || zoom.current >= zoom.max} onClick={() => void changeZoom("increase")}>Zoom LinkedIn in</button>
                  <button type="button" className="pilot-link text-xs" disabled={zooming || zoom.current === 100} onClick={() => void changeZoom("reset")}>Reset to 100%</button>
                </div>
                <p className="text-xs text-slate-600">Chrome may ask permission to change the shared tab’s zoom. This changes LinkedIn itself; reset it here before reading if you want its usual size.</p>
              </> : <p className="text-xs text-slate-600">This browser does not expose tab zoom controls. Use the zoom menu in your LinkedIn tab, then return here.</p>}
            </div>
            <label className="block text-sm font-medium">Text language
              <select className="pilot-field mt-1" value={language} onChange={event => setLanguage(event.target.value as "eng" | "eng+rus")}><option value="eng">English</option><option value="eng+rus">English and Russian</option></select>
            </label>
            <label className="block text-sm font-medium">Reading mode
              <select className="pilot-field mt-1" value={mode} onChange={event => setMode(event.target.value as "single" | "scroll")}><option value="scroll">Continuous — scroll in this preview</option><option value="single">One visible view — stop automatically</option></select>
            </label>
            </Settings>
          </>}
          {scrollSupported ? <div className="rounded-lg bg-primary-50 p-3 text-sm">
            {previewScroll ? <p>Scroll over the preview below to move LinkedIn. Stay on this page and pause briefly at each job header.</p> : <><p>Scroll LinkedIn from this preview without switching tabs. Your browser may ask permission to control the shared tab.</p><button type="button" className="pilot-button-secondary mt-2" disabled={scrollRequest} onClick={() => void enablePreviewScroll()}>{scrollRequest ? "Waiting for browser permission…" : "Enable scrolling in preview"}</button></>}
          </div> : <p className="text-xs text-slate-600">This browser does not support scrolling a shared tab from its preview. Use desktop Chrome for this option.</p>}
          <div className="relative overflow-hidden rounded-md border border-border bg-slate-100">
            <video ref={video} muted playsInline autoPlay className="block h-auto w-full" aria-label="Preview of your shared LinkedIn tab" />
            <div ref={previewSurface} className={"absolute inset-0 touch-none " + (running ? "cursor-ns-resize" : "cursor-crosshair")} aria-label={running ? "Scroll LinkedIn in this preview" : "Drag to select the Experience capture area"}
              onPointerDown={event => { if (running) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = point(event); setAreaChosen(false); }}
              onPointerMove={event => { if (!drag.current) return; const end = point(event); setArea({ x: Math.min(end.x, drag.current.x), y: Math.min(end.y, drag.current.y), width: Math.abs(end.x - drag.current.x), height: Math.abs(end.y - drag.current.y) }); }}
              onPointerUp={() => { if (!drag.current) return; drag.current = undefined; if (area.width < 0.08 || area.height < 0.06) { setArea(fullCaptureArea); setAreaChosen(false); } else setAreaChosen(true); }} onPointerCancel={() => { drag.current = undefined; setAreaChosen(false); }}>
              {areaChosen || drag.current ? <div className="pointer-events-none absolute border-2 border-blue-600 bg-blue-500/10" style={{ left: area.x * 100 + "%", top: area.y * 100 + "%", width: area.width * 100 + "%", height: area.height * 100 + "%" }} /> : null}
            </div>
          </div>
          {!running && <>
            <details className="text-xs text-slate-600"><summary className="cursor-pointer">Use the entire tab instead</summary><p className="mt-1">Use this only when the preview contains Experience without a sidebar. Extra text can reduce accuracy.</p><button type="button" className="pilot-link mt-2" onClick={() => { setArea(fullCaptureArea); setAreaChosen(true); }}>Select entire tab</button></details>
            <button type="button" className="pilot-button" disabled={!areaChosen || disabled || zooming || scrollRequest} onClick={() => void beginReading()}>Start reading</button>
            {!areaChosen && <p className="text-xs text-slate-600">Select the text area in the preview to enable reading.</p>}
          </>}
          {running && <p className="text-sm">{mode === "single" ? "Keep this view still. Reading and sharing will stop automatically after this view is recognized." : <>Scroll over the preview and pause at each job header. Reading continues automatically. Select <strong>Stop and review</strong> when you reach the end.</>}</p>}
        </div>}
      </li>}
    </ol>
    {!supported && <p className="rounded-lg bg-primary-50 p-3 text-sm text-slate-700">Tab sharing is unavailable in this browser. Use desktop Chrome or Edge, or upload a file.</p>}
    {(!compact || sharing || requesting) && <p className="text-xs text-slate-600">Only the selected tab is shared, without audio. Sharing stops when you leave this import, after 30 views, or after 5 minutes.</p>}
    {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
    {status && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">{status}</p>}
    {readingIssues && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">{readingIssues}</p>}
    {!running && recognizedText && <details className="text-sm">
      <summary className="cursor-pointer font-medium">Check or correct the last recognized view</summary>
      <textarea className="pilot-field mt-2 min-h-40 font-mono text-xs" aria-label="Recognized LinkedIn Experience text" maxLength={30000} value={recognizedText} onChange={event => setRecognizedText(event.target.value)} />
      <button type="button" className="pilot-button-secondary mt-2" onClick={() => { addText(recognizedText, true); setStatus("Draft roles updated from the corrected text."); }}>Use corrected text</button>
    </details>}
    {!running && roles.length > 0 && <section className="rounded-lg border border-border p-3" aria-label="Roles captured from your LinkedIn tab">
      <h3 className="text-sm font-semibold">{roles.length} draft {roles.length === 1 ? "role" : "roles"} ready to review</h3>
      {!compact && <><p className="mt-1 text-xs text-slate-600">Check each company, title and date. Discard incorrect rows before continuing.</p>
      <ul className="mt-2 divide-y divide-border">{roles.map(role => <li key={capturedRoleKey(role)} className="flex items-start justify-between gap-2 py-2 text-sm">
        <div className="min-w-0 break-words"><p className="font-medium">{role.title || "Job title needs review"}</p><p>{role.company || "Company needs review"}</p><p className="text-slate-600">{role.start} to {role.end}</p>{role.needsReview && <p className="text-xs font-medium text-amber-900">Unclear text — check this role before saving.</p>}</div>
        <button type="button" className="pilot-link shrink-0 text-xs" aria-label={"Discard " + role.title + " at " + role.company} onClick={() => { const key = capturedRoleKey(role); discarded.current.add(key); updateRoles(rolesRef.current.filter(item => capturedRoleKey(item) !== key)); }}>Discard</button>
      </li>)}</ul></>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="pilot-button" disabled={disabled} onClick={() => { const result = { linkedinProfileUrl: sourceUrl.current, positions: roles }; stop(); onImported(result); clearDrafts(); }}>Review captured roles</button>
        <button type="button" className="pilot-button-secondary" onClick={() => { clearDrafts(); setStatus("Captured drafts cleared. Your saved work history is unchanged."); }}>Clear captures</button>
      </div>
    </section>}
  </div>;
}
