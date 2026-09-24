import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseUtcInput, toUtcFields, formatTime, formatDate, dayKey, calendarDayDiff, offsetLabel, offsetMinutes,
  parseDuration, formatCountdown, formatCountdownClock, splitDuration, formatDurationInput, isValidTimeZone, zoneCity,
  HOUR, MINUTE, DAY, SECOND,
} from "../lib/time.js";
import { CITIES, searchZones } from "../lib/cities.js";

test("parseUtcInput builds exact UTC instants", () => {
  assert.equal(parseUtcInput("2026-09-24", "14:30"), Date.UTC(2026, 8, 24, 14, 30));
  assert.equal(parseUtcInput("2026-09-24", "00:00:05"), Date.UTC(2026, 8, 24, 0, 0, 5));
});

test("parseUtcInput rejects invalid / ambiguous input", () => {
  for (const [d, t] of [["2026-02-30", "10:00"], ["2026-13-01", "10:00"], ["24/09/2026", "10:00"], ["2026-09-24", "24:00"],
    ["2026-09-24", "10:60"], ["", "10:00"], ["2026-09-24", ""], ["Sep 24 2026", "10:00"]]) {
    assert.equal(parseUtcInput(d, t), null, `${d} ${t}`);
  }
  assert.ok(parseUtcInput("2028-02-29", "10:00")); // leap day ok
});

test("toUtcFields round-trips", () => {
  const ms = Date.UTC(2026, 0, 5, 3, 7);
  const f = toUtcFields(ms);
  assert.deepEqual(f, { date: "2026-01-05", time: "03:07" });
  assert.equal(parseUtcInput(f.date, f.time), ms);
});

test("UTC converts to Auckland local time, crossing midnight", () => {
  const ms = Date.UTC(2026, 8, 24, 14, 30); // NZST (+12); NZ DST starts 27 Sep 2026
  assert.equal(formatTime(ms, "Pacific/Auckland", "en"), "2:30\u00A0AM");
  assert.equal(dayKey(ms, "Pacific/Auckland"), "2026-09-25");
  assert.equal(dayKey(ms, "UTC"), "2026-09-24");
  assert.equal(calendarDayDiff(ms, ms + 12 * HOUR, "UTC"), 1);
  assert.equal(offsetMinutes("Pacific/Auckland", ms), 12 * 60);
});

test("daylight saving transitions: same UTC hour, different local hour", () => {
  const before = Date.UTC(2026, 8, 26, 12, 0);
  const after = Date.UTC(2026, 8, 27, 12, 0);
  assert.equal(formatTime(before, "Pacific/Auckland", "en"), "12:00\u00A0AM");
  assert.equal(formatTime(after, "Pacific/Auckland", "en"), "1:00\u00A0AM");
  assert.equal(offsetLabel("Pacific/Auckland", before), "GMT+12");
  assert.equal(offsetLabel("Pacific/Auckland", after), "GMT+13");
  assert.equal(offsetMinutes("America/New_York", Date.UTC(2026, 9, 31, 12)), -4 * 60);
  assert.equal(offsetMinutes("America/New_York", Date.UTC(2026, 10, 2, 12)), -5 * 60);
  assert.equal(formatTime(Date.UTC(2026, 9, 24, 12), "Europe/London", "en"), "1:00\u00A0PM");
  assert.equal(formatTime(Date.UTC(2026, 9, 26, 12), "Europe/London", "en"), "12:00\u00A0PM");
  assert.equal(offsetLabel("UTC", 0), "GMT+0");
});

test("friends in different zones show different local days", () => {
  const ms = Date.UTC(2026, 8, 23, 23, 0);
  assert.equal(dayKey(ms, "Pacific/Auckland"), "2026-09-24");
  assert.equal(dayKey(ms, "America/Chicago"), "2026-09-23");
  assert.equal(formatTime(ms, "America/Chicago", "en"), "6:00\u00A0PM");
  assert.equal(formatTime(ms, "Asia/Kolkata", "en"), "4:30\u00A0AM");
});

test("formatDate localizes", () => {
  const ms = Date.UTC(2026, 8, 24, 10);
  assert.match(formatDate(ms, "UTC", "en"), /Thu/);
  assert.match(formatDate(ms, "UTC", "de"), /Do/);
});

test("parseDuration accepts game and shorthand formats", () => {
  assert.equal(parseDuration("1d 03:12:44"), DAY + 3 * HOUR + 12 * MINUTE + 44 * SECOND);
  assert.equal(parseDuration("03:12:44"), 3 * HOUR + 12 * MINUTE + 44 * SECOND);
  assert.equal(parseDuration("3:12"), 3 * HOUR + 12 * MINUTE);
  assert.equal(parseDuration("2h 30m"), 2.5 * HOUR);
  assert.equal(parseDuration("1d2h"), DAY + 2 * HOUR);
  assert.equal(parseDuration("90m"), 90 * MINUTE);
  assert.equal(parseDuration("45"), 45 * MINUTE);
  assert.equal(parseDuration("45s"), 45 * SECOND);
  for (const bad of ["", "abc", "0", "00:00:00", "3:75", "2h banana", "-5m"]) assert.equal(parseDuration(bad), null, bad);
});

test("countdown formatting handles zero, negatives and rounding", () => {
  assert.equal(formatCountdown(0, "en"), "0s");
  assert.equal(formatCountdown(-5000, "en"), "0s");
  assert.equal(formatCountdown(400, "en"), "1s");
  assert.equal(formatCountdown(45 * SECOND, "en"), "45s");
  assert.equal(formatCountdown(13 * MINUTE + 5 * SECOND, "en"), "13m 5s");
  assert.equal(formatCountdown(4 * HOUR + 13 * MINUTE, "en"), "4h 13m");
  assert.equal(formatCountdown(2 * DAY + 4 * HOUR, "en"), "2d 4h");
  assert.equal(formatCountdown(2 * DAY, "en"), "2d");
  assert.equal(formatCountdownClock(4 * HOUR + 13 * MINUTE + 5 * SECOND, "en"), "04:13:05");
  assert.equal(formatCountdownClock(DAY + 5 * SECOND, "en"), "1d 00:00:05");
  assert.equal(formatCountdownClock(-1, "en"), "00:00:00");
  assert.deepEqual(splitDuration(-100), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.equal(formatDurationInput(DAY + 3 * HOUR + 4 * SECOND), "1d 03:00:04");
  console.log("ru:", formatCountdown(2 * HOUR + 5 * MINUTE, "ru"), "| pl:", formatCountdown(DAY * 2 + HOUR, "pl"),
    "| ar:", formatCountdown(2 * HOUR + 5 * MINUTE, "ar"), "| ko:", formatCountdownClock(DAY + HOUR, "ko"));
});

test("zone helpers + bundled cities are all valid IANA zones", () => {
  assert.ok(isValidTimeZone("America/Chicago"));
  assert.ok(!isValidTimeZone("Mars/Base"));
  assert.equal(zoneCity("America/Los_Angeles"), "Los Angeles");
  for (const [city, , tz] of CITIES) assert.ok(isValidTimeZone(tz), `${city} ${tz}`);
  assert.equal(searchZones("auck")[0].tz, "Pacific/Auckland");
  assert.equal(searchZones("sao paulo")[0].tz, "America/Sao_Paulo");
  assert.ok(searchZones("chicago").some((r) => r.tz === "America/Chicago"));
  assert.deepEqual(searchZones(""), []);
});
