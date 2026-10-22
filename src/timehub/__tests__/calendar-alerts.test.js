import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarAlerts, buildICS } from '../lib/ics.js';
import { emptyState, sanitizeState } from '../lib/storage.js';
const now = Date.UTC(2026, 9, 22);
const item = { uid: 'event-1', start: now + 3600000, title: 'Bear Trap' };

test('existing alert preferences migrate, including no alert', () => {
  assert.deepEqual(calendarAlerts({}), [10]);
  assert.deepEqual(calendarAlerts({ calendarAlarmMin: 30 }), [30]);
  assert.deepEqual(calendarAlerts({ calendarAlarmMin: 0 }), []);
  assert.deepEqual(calendarAlerts({ calendarAlertsMin: [], calendarAlarmMin: 10 }), []);
});

test('zero, one and two alerts survive saving and loading', () => {
  for (const values of [[], [0], [15], [60, 5]]) {
    const raw = emptyState(now);
    raw.settings.calendarAlertsMin = values;
    assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(raw)), now).settings.calendarAlertsMin, values);
  }
});

test('exports support no alarm, at-start alarms and two distinct alarms', () => {
  assert.doesNotMatch(buildICS([{ ...item, alarmsMin: [] }]), /BEGIN:VALARM/);
  const one = buildICS([{ ...item, alarmsMin: [0] }]);
  assert.equal((one.match(/BEGIN:VALARM/g) || []).length, 1);
  assert.match(one, /TRIGGER:-PT0M/);
  const two = buildICS([{ ...item, alarmsMin: [60, 5] }]);
  assert.equal((two.match(/BEGIN:VALARM/g) || []).length, 2);
  assert.match(two, /TRIGGER:-PT60M/);
  assert.match(two, /TRIGGER:-PT5M/);
});

test('duplicate alerts export once and malformed preferences are bounded', () => {
  assert.equal((buildICS([{ ...item, alarmsMin: [10, 10] }]).match(/BEGIN:VALARM/g) || []).length, 1);
  assert.deepEqual(calendarAlerts({ calendarAlertsMin: [-1, null, '5', Infinity, 10081, 15, 30, 60] }), [15, 30]);
});
