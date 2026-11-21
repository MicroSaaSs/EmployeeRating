import assert from "node:assert/strict";
import { test } from "node:test";
import { captureChanged, capturedRoleKey, createTabCaptureController, linkedInHeaderRegions, linkedInHeaderText, linkedInOcrText, linkedInTabUrl, mergeCapturedRoles, parseLinkedInScreenText, requireSharedTab, stopSharedTab } from "../src/utils/linkedinTabCapture.ts";
import { linkedInPosition, matchLinkedInPosition } from "../src/utils/linkedinPositions.ts";

test("normalizes member links without allowing another origin or credentials", () => {
  assert.equal(linkedInTabUrl("uk.linkedin.com/in/EXAMPLE/?tracking=removed"), "https://www.linkedin.com/in/example/");
  assert.equal(linkedInTabUrl("https://www.linkedin.com/in/example/details/experience/"), "https://www.linkedin.com/in/example/");
  for (const url of ["https://linkedin.com.evil.example/in/example/", "https://user:password@linkedin.com/in/example/", "https://linkedin.com:444/in/example/", "https://linkedin.com/company/example/", "javascript:alert(1)"]) assert.throws(() => linkedInTabUrl(url));
});

test("zoom controls are optional and detecting them never requests permission or changes zoom", () => {
  assert.equal(createTabCaptureController({}), undefined);
  assert.equal(createTabCaptureController({ CaptureController: class { constructor() { throw Error("Unavailable"); } } }), undefined);
  assert.equal(createTabCaptureController({ CaptureController: class extends EventTarget {} }), undefined);
  const actions = [];
  class Controller extends EventTarget {
    zoomLevel = 100;
    getSupportedZoomLevels() { return [50, 75, 100, 125]; }
    async decreaseZoomLevel() { actions.push("out"); }
    async increaseZoomLevel() { actions.push("in"); }
    async resetZoomLevel() { actions.push("reset"); }
  }
  assert.ok(createTabCaptureController({ CaptureController: Controller }) instanceof Controller);
  assert.deepEqual(actions, []);
});

test("accepts only browser-tab capture and stops rejected video/audio tracks", () => {
  for (const surface of ["monitor", "window", undefined]) {
    const stopped = [];
    const track = { stop() { stopped.push("video"); }, getSettings() { return { displaySurface: surface }; } };
    const audio = { stop() { stopped.push("audio"); } };
    const stream = { getTracks: () => [track, audio], getVideoTracks: () => [track], getAudioTracks: () => [audio] };
    assert.throws(() => requireSharedTab(stream), /not a window or entire screen/);
    assert.deepEqual(stopped, ["video", "audio"]);
  }
  const stopped = [];
  const track = { stop() { stopped.push("video"); }, getSettings: () => ({ displaySurface: "browser" }) };
  const audio = { stop() { stopped.push("audio"); } };
  const stream = { getTracks: () => [track, audio], getVideoTracks: () => [track], getAudioTracks: () => [audio] };
  assert.equal(requireSharedTab(stream), track);
  assert.deepEqual(stopped, ["audio"]);
  stopSharedTab(stream);
  assert.deepEqual(stopped, ["audio", "video", "audio"]);
});

test("extracts individual experience while excluding the header and Education", () => {
  const { roles } = parseLinkedInScreenText(`Name\nEngineer headline\nExperience\nFull Stack Developer\nExample Analytics · Full-time\nOct 2023 - Present · 3 yrs\nRemote\nFull Stack Developer\nSample Software LTD · Full-time\n2021 – Oct 2023 · 2 yrs\nEducation\nStudent\nUniversity\n2010 – 2014`);
  assert.deepEqual(roles, [
    { company: "Example Analytics", title: "Full Stack Developer", start: "Oct 2023", end: "Present" },
    { company: "Sample Software LTD", title: "Full Stack Developer", start: "2021", end: "Oct 2023" },
  ]);
});

test("handles grouped employers and continues a group across captures", () => {
  const first = parseLinkedInScreenText(`Experience\nExample Co\nFull-time · 4 yrs\nSenior Engineer\nJan 2023 - Present\nEngineer\n2021 – 2023`);
  assert.equal(first.roles.length, 2);
  assert.ok(first.roles.every(role => role.company === "Example Co"));
  const next = parseLinkedInScreenText("Junior Engineer\n2019 – 2021", first.group);
  assert.deepEqual(next.roles, [{ company: "Example Co", title: "Junior Engineer", start: "2019", end: "2021" }]);
});

test("keeps grouped employer context through locations and skills, then resets it for individual employers", () => {
  const first = parseLinkedInScreenText(`Experience\nExample Technologies\nFull-time · 4 yrs 8 mos\nRishon LeZion, Center District, Israel\nAl Software Engineer Present\nDec 2025 - Present - 1yr\nHybrid\nTech: Python, FastAPI, MCP\nRAG, Node.js, Angular, MongoDB\nTesting Tools Developer\nApr 2022 - Dec 2025 · 3yrs 9mos`);
  assert.deepEqual(first.roles, [
    { company: "Example Technologies", title: "AI Software Engineer", start: "Dec 2025", end: "Present" },
    { company: "Example Technologies", title: "Testing Tools Developer", start: "Apr 2022", end: "Dec 2025" },
  ]);
  assert.equal(first.group, "Example Technologies");
  const next = parseLinkedInScreenText(`RAG, Node.js, Angular, MongoDB\nTesting Tools Developer\nApr 2022 - Dec 2025\nSkills: JavaScript, Spring Framework\nFull Stack Java Developer\nSample Software LTD · Full-time\n2021 – 2022 yan\nHaifa, Israel\nJava Backend Developer\nSample Energy OAO · Full-time\n2018 – 2021\nMoscow, Russia\nHelp desk technician\nJSC Example Utility\n2015 – 2018`, first.group);
  assert.equal(next.group, "");
  assert.equal(next.roles[0].company, "Example Technologies");
  assert.equal(next.roles[1].company, "Sample Software LTD");
  assert.equal(next.roles[1].end, "2022");
  assert.equal(next.roles[3].company, "JSC Example Utility");
  const merged = mergeCapturedRoles(first.roles, next.roles);
  assert.equal(merged.length, 5);
  assert.equal(capturedRoleKey({ ...first.roles[0], end: "Present - 1yr" }), capturedRoleKey(first.roles[0]));
});

test("supports Russian month labels and makes unreadable end dates require review", () => {
  const { roles } = parseLinkedInScreenText("Опыт работы\nРазработчик\nКомпания · Полная занятость\nянваря 2021 — октября 2023\nEngineer\nOther Co\nJan 2020 - Unreadable");
  assert.equal(roles.length, 2);
  const dated = linkedInPosition(0, roles[0].company, roles[0].title, roles[0].start, roles[0].end);
  assert.equal(dated.entry.start, "2021-01-01");
  assert.equal(dated.entry.end, "2023-10-31");
  const incomplete = linkedInPosition(1, roles[1].company, roles[1].title, roles[1].start, roles[1].end);
  assert.equal(incomplete.endRequired, true);
  assert.equal(incomplete.entry.end, "");
});

test("keeps current roles current when OCR reads the duration separator as a dash", () => {
  const { roles } = parseLinkedInScreenText("Experience\nEngineer\nExample Co - Full-time\nOct 2023 - Present - 3 yrs 2 mos");
  assert.equal(roles.length, 1);
  assert.equal(roles[0].end, "Present");
  const position = linkedInPosition(0, roles[0].company, roles[0].title, roles[0].start, roles[0].end);
  assert.equal(position.source.end, null);
});

test("merges overlapping captures and recognizes roles already saved from PDF/CSV", () => {
  const role = { company: "Example Analytics", title: "Full Stack Developer", start: "Oct 2023", end: "Present" };
  const merged = mergeCapturedRoles([role], [role, { ...role, company: "Example  Analytics", title: "Full Stack Developer " }, { ...role, end: "Current" }]);
  assert.equal(merged.length, 1);
  const position = linkedInPosition(0, role.company, role.title, role.start, role.end);
  assert.equal(matchLinkedInPosition(position, { company: role.company, title: role.title, start: "2023-10-22", end: null }), true);
  assert.equal(capturedRoleKey(merged[0]), capturedRoleKey(role));
  assert.deepEqual(parseLinkedInScreenText("Some unrelated text without dates").roles, []);
});

test("correcting a captured date replaces the OCR error rather than duplicating the role", () => {
  const wrong = { company: "Example Co", title: "Engineer", start: "2021", end: "Unreadable" };
  const corrected = { ...wrong, end: "Oct 2023" };
  const other = { company: "Other Co", title: "Developer", start: "2019", end: "2020" };
  const merged = mergeCapturedRoles([other, wrong], [corrected], new Set([capturedRoleKey(wrong)]));
  assert.deepEqual(merged, [other, corrected]);
  const ongoingWithNoise = { ...wrong, end: "Present -" };
  const ongoing = { ...wrong, end: "Present" };
  assert.deepEqual(mergeCapturedRoles([ongoingWithNoise], [ongoing], new Set([capturedRoleKey(ongoingWithNoise)])), [ongoing]);
});

test("scrolling views wait for stability and repeated unchanged views do not consume captures", () => {
  const still = new Uint8Array(1000).fill(240);
  assert.equal(captureChanged(undefined, still), true);
  assert.equal(captureChanged(still, still), false);
  const tinyFlicker = still.slice(); tinyFlicker[15] = 0;
  assert.equal(captureChanged(still, tinyFlicker), false);
  const scrolling = still.map((value, index) => index % 4 === 0 ? 20 : value);
  assert.equal(captureChanged(still, scrolling), true);
  assert.equal(captureChanged(scrolling, scrolling), false);
});

test("removes verification-icon and sticky-title suffixes and consolidates logo prefixes", () => {
  const first = parseLinkedInScreenText("Experience\nFull Stack Developer Present\nExample Company\nOct 2023 - Present\nFull Stack Developer V4\nAt Earlier Company\n2021 - Oct 2023").roles;
  const second = parseLinkedInScreenText("Experience\nFull Stack Developer V4 Example Company\nEarlier Company\n2021 - Oct 2023").roles;
  assert.equal(first[0].title, "Full Stack Developer");
  const merged = mergeCapturedRoles(first, second);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].company, "Earlier Company");
  const differentRole = { ...second[0], title: "Team Lead" };
  const differentDates = { ...second[0], start: "2018" };
  const differentEmployer = { ...second[0], company: "Another Company" };
  assert.equal(mergeCapturedRoles(merged, [differentRole, differentDates, differentEmployer]).length, 5);
});

test("uses OCR alignment and confidence to exclude logo glyphs and unreadable title lines", () => {
  const line = (parts, y) => {
    const words = parts.map(([text, x, confidence = 96]) => ({ text, confidence, bbox: { x0: x, x1: x + text.length * 9, y0: y, y1: y + 20 } }));
    return { text: words.map(word => word.text).join(" "), words };
  };
  const page = { text: "", blocks: [{ paragraphs: [{ lines: [
    line([["Experience", 100]], 20),
    line([["Engineer", 100]], 70),
    line([["mm", 20, 85], ["Example", 100], ["Company", 175]], 100),
    line([["2021", 100], ["-", 145], ["Present", 160]], 130),
    line([["1", 20, 20], ["un", 100, 14], ["vwavn", 140, 22], ["Arsene", 200, 28]], 200),
    line([["Other", 100], ["Company", 160]], 230),
    line([["2018", 100], ["-", 145], ["2021", 160]], 260),
  ] }] }] };
  const text = linkedInOcrText(page);
  assert.ok(!text.includes("mm"));
  assert.ok(text.includes("[unreadable line]"));
  assert.deepEqual(parseLinkedInScreenText(text).roles, [{ company: "Example Company", title: "Engineer", start: "2021", end: "Present" }]);
});

test("date-anchored re-reading excludes a prior media caption and does not depend on title confidence", () => {
  const line = (text, y, confidence = 96) => ({ text, words: text.split(" ").map((text, index) => ({ text, confidence, bbox: { x0: 100 + index * 70, x1: 150 + index * 70, y0: y, y1: y + 20 } })) });
  const page = { text: "", blocks: [{ paragraphs: [{ lines: [
    line("Middle Computing Solutions", 700),
    line("Full Stack Developer", 800, 25),
    line("Next Company LTD", 830),
    line("2018 - 2021", 860),
    line("Education", 980),
    line("2010 - 2014", 1050),
  ] }] }] };
  const [region, ...others] = linkedInHeaderRegions(page, 1000, 1400);
  assert.deepEqual(others, []);
  assert.equal(region.start, "2018");
  assert.ok(region.top > 700 && region.top < 800, "the actual job heading, not the media caption, is re-read");
  assert.ok(region.left > 80, "left-side company logo pixels are excluded");
  const spaced = { text: "", blocks: [{ paragraphs: [{ lines: [line("Senior Software Engineer", 100), line("Example Company", 150), line("2021 - Present", 200)] }] }] };
  assert.ok(linkedInHeaderRegions(spaced, 1000, 600)[0].top < 100, "larger heading spacing must not clip the top of title glyphs");
});

test("marks clipped or unreadable date rows for another view instead of inventing a role", () => {
  const page = (month, y) => ({ text: "", blocks: [{ paragraphs: [{ lines: [{
    text: month + " 2022 - Dec 2025",
    words: [month, "2022", "-", "Dec", "2025"].map((text, index) => ({ text, confidence: 70, bbox: { x0: 100 + index * 60, x1: 145 + index * 60, y0: y, y1: y + 20 } })),
  }] }] }] });
  assert.equal(linkedInHeaderRegions(page("Apr", 195), 1000, 216)[0].incomplete, true);
  assert.equal(linkedInHeaderRegions(page("Anr", 195), 1000, 600)[0].incomplete, true);
  assert.equal(linkedInHeaderRegions(page("Apr", 195), 1000, 600)[0].incomplete, undefined);
});

test("a clearer overlapping capture replaces an unreadable dated role instead of duplicating it", () => {
  const pending = { company: "", title: "", start: "2021", end: "Oct 2023", needsReview: true };
  const clear = { company: "Middle Company", title: "Developer", start: "2021", end: "Oct 2023" };
  assert.deepEqual(mergeCapturedRoles([pending], [clear]), [clear]);
  assert.deepEqual(mergeCapturedRoles([clear], [pending]), [clear]);
});

test("the edit-pencil OCR token 74 is excluded spatially so all five existing roles match", () => {
  const entries = [
    { company: "Example Analytics", title: "Full Stack Developer", start: "Oct 2023", end: "Present", savedStart: "2023-10-22", savedEnd: null },
    { company: "Sample Software LTD", title: "Full Stack Developer", start: "2021", end: "Oct 2023", savedStart: "2021-01-01", savedEnd: "2023-10-31" },
    { company: "Sample Systems Ltd", title: "Full Stack Developer", start: "2018", end: "2021", savedStart: "2018-01-01", savedEnd: "2021-12-31" },
    { company: "Example Construction Ltd.", title: "1C Software Developer", start: "2013", end: "2018", savedStart: "2013-01-01", savedEnd: "2018-12-31" },
    { company: "Sample Support Ltd", title: "IT Specialist", start: "2008", end: "2012", savedStart: "2008-01-01", savedEnd: "2012-12-31" },
  ];
  const word = (text, x0, x1, y0) => ({ text, confidence: 98, bbox: { x0, x1, y0, y1: y0 + 24 } });
  for (const [id, entry] of entries.entries()) {
    const page = { text: "", blocks: [{ paragraphs: [{ lines: [
      { text: entry.title + " 74", words: [word(entry.title, 10, 350, 10), word("74", 900, 925, 10)] },
      { text: entry.company, words: [word(entry.company, 10, 300, 50)] },
      { text: entry.start + " - " + entry.end, words: [word(entry.start + " - " + entry.end, 10, 400, 90)] },
    ] }] }] };
    const text = linkedInHeaderText(page, 1000);
    assert.ok(!text.includes("74"));
    const [role] = parseLinkedInScreenText(text).roles;
    assert.equal(role.title, entry.title);
    const position = linkedInPosition(id, role.company, role.title, role.start, role.end);
    const savedTitle = entry.title.startsWith("1C ") ? entry.title.replace("1C ", "1С ") : entry.title;
    assert.equal(matchLinkedInPosition(position, { company: entry.company, title: savedTitle, start: entry.savedStart, end: entry.savedEnd }), true);
  }
  // Real numbers or versions in a title must survive: their spacing is part of normal text.
  const legitimate = { text: "", blocks: [{ paragraphs: [{ lines: [
    { text: "Engineer 74", words: [word("Engineer", 10, 150, 10), word("74", 165, 195, 10)] },
    { text: "Developer 74", words: [word("Developer", 700, 850, 50), word("74", 860, 890, 50)] },
  ] }] }] };
  assert.equal(linkedInHeaderText(legitimate, 1000), "Engineer 74\nDeveloper 74");
});

test("excludes disconnected recommendation text on the same baseline as a real job title", () => {
  const word = (text, x0, x1) => ({ text, confidence: 98, bbox: { x0, x1, y0: 10, y1: 30 } });
  const page = { text: "", blocks: [{ paragraphs: [{ lines: [
    { text: "Full Stack Java Developer & Full Stack Developer - 70% Front-", words: [word("Full Stack Java Developer", 10, 320), word("&", 880, 890), word("Full Stack Developer - 70% Front-", 900, 1200)] },
  ] }] }] };
  assert.equal(linkedInHeaderText(page, 1250), "Full Stack Java Developer");
});
