"""Turn the private export's summary.json into the public snapshot: only what the public site can show.

The site shows at most PUBLIC_ROWS entities per list (site/src/data/public.ts). This script works out
every entity that can appear in such a list under the range presets (last 7, 30 and 90 days, and the
whole window), in either credential mode and for every sort and filter the screens offer, and keeps
those by name. Every other entity is summed into one "Other entities" row per day, so day totals and
charts stay exact while their per-entity figures are gone.

It also drops the per-day record files from the file index, the per-day balance flags, collection
internals (API-key usage, rate-limit headers, per-key access checks) and fields the site never reads.

    python tools/make_public_summary.py <private summary.json> site/public/data/summary.json
"""
import json
import sys
from collections import defaultdict
from datetime import date, timedelta

PUBLIC_ROWS = 5
OTHER = 'Other entities'
# Always named: the unlabelled bucket feeds the "Labelled ETH" tile, StakeWise is the ENT scale-check
# example, and Lido CM v2 is this project's own contract label.
ALWAYS = {'Unknown entity', 'StakeWise', 'Lido CM v2'}
RUN_FIELDS = ('id', 'start', 'end', 'days', 'enriched_scope', 'enrichment_finished_at', 'events_complete', 'last_finished_at')
NETWORK_FIELDS = ('epoch', 'validators_count', 'total_active_balance', 'participation_rate', 'finality')


def ranges(days):
    """Day sets of the site's presets (models.ts presets) plus the whole window."""
    collected = [d['day'] for d in days if d['state'] != 'not_collected']
    end = date.fromisoformat(collected[-1])
    out = [set(collected)]
    for n in (7, 30, 90):
        start = (end - timedelta(days=n - 1)).isoformat()
        out.append({d for d in collected if d >= start})
    return out


def ranked(totals, key):
    """Largest first, ties by name: the order of the site's tables."""
    return [e for e, _ in sorted(totals.items(), key=lambda kv: (-key(kv[1]), kv[0]))]


def deposit_tops(entity_daily, days):
    by = defaultdict(lambda: {'wei': 0, '0x01': 0, '0x02': 0})
    for r in entity_daily:
        if r['day'] in days:
            by[r['entity']]['wei'] += int(r['wei'])
            if r['prefix'] in ('0x01', '0x02'):
                by[r['entity']][r['prefix']] += int(r['wei'])
    for field in ('wei', '0x01', '0x02'):  # the ranking's sort options
        yield ranked(by, lambda v: v[field])[:PUBLIC_ROWS]


def request_tops(entity_daily, days):
    by = defaultdict(lambda: {'transfer': 0, 'completed': 0, 'switches': 0})
    for r in entity_daily:
        if r['day'] in days:
            by[r['entity']]['transfer'] += int(r['transfer_wei'])
            by[r['entity']]['completed'] += r['completed']
            by[r['entity']]['switches'] += r['switches_completed']
    order = [e for e, _ in sorted(by.items(), key=lambda kv: (-kv[1]['transfer'], -kv[1]['switches'], kv[0]))]
    yield [e for e in order if by[e]['completed']][:PUBLIC_ROWS]
    yield [e for e in order if by[e]['switches']][:PUBLIC_ROWS]


def submission_tops(entity_daily, days):
    for prefix in ('0x01', '0x02', '0x00', ''):  # the SUB prefix filter
        by = defaultdict(int)
        for r in entity_daily:
            if r['day'] in days and (not prefix or r['prefix'] == prefix):
                by[r['entity']] += int(r['wei'])
        yield ranked(by, lambda v: v)[:PUBLIC_ROWS]


def fold(rows, keep, key_fields, sum_fields, wei_fields=(), dict_fields=()):
    """Keep rows of named entities; sum the rest into one OTHER row per key."""
    out, other = [], {}
    for r in rows:
        if r['entity'] in keep:
            out.append(r)
            continue
        k = tuple(r[f] for f in key_fields)
        o = other.setdefault(k, {**{f: r[f] for f in key_fields}, 'entity': OTHER,
                                 **{f: 0 for f in sum_fields}, **{f: 0 for f in wei_fields}, **{f: {} for f in dict_fields}})
        for f in sum_fields:
            o[f] += r.get(f) or 0
        for f in wei_fields:
            o[f] += int(r.get(f) or 0)
        for f in dict_fields:
            for name, n in (r.get(f) or {}).items():
                o[f][name] = o[f].get(name, 0) + n
    for o in other.values():
        for f in wei_fields:
            o[f] = str(o[f])
        for f in dict_fields:
            if not o[f]:
                del o[f]
    return out + sorted(other.values(), key=lambda o: [o[f] for f in key_fields])


def main(src, dst):
    with open(src, encoding='utf-8') as f:
        s = json.load(f)

    keep = set(ALWAYS)
    for days in ranges(s['days']):
        for dep in (s['deposits'], s['deposits_submitted']):
            for top in deposit_tops(dep['entity_daily'], days):
                keep.update(top)
        for top in request_tops(s['requests']['entity_daily'], days):
            keep.update(top)
        for top in submission_tops(s['submissions']['entity_daily'], days):
            keep.update(top)

    for dep in (s['deposits'], s['deposits_submitted']):
        dep['entity_daily'] = fold(dep['entity_daily'], keep, ('day', 'prefix'), ('count',), ('wei',))
        dep['entities'] = [e for e in dep['entities'] if e['entity'] in keep]
    req = s['requests']
    req['entity_daily'] = fold(req['entity_daily'], keep, ('day',),
                               ('requests', 'completed', 'switches_completed', 'switch_balance_count'),
                               ('transfer_wei', 'switch_effective_wei'), ('consolidation_statuses',))
    req['entities'] = [e for e in req['entities'] if e['entity'] in keep]
    s['submissions']['entity_daily'] = fold(s['submissions']['entity_daily'], keep, ('day', 'prefix'), ('count',), ('wei',))

    cohort = s['cohort']
    cohort['entities'] = [e for e in cohort['entities'] if e['entity'] in keep]
    for snapshot in cohort['by_epoch'].values():
        snapshot['entities'] = [e for e in snapshot['entities'] if e['entity'] in keep]

    s['entitychecks'] = [e for e in s['entitychecks'] if e['entity'] in keep]
    crosscheck = s['validation'].get('entity_crosscheck')
    if crosscheck and crosscheck.get('unit_checks'):
        checks = crosscheck['unit_checks']
        crosscheck['unit_checks'] = [{'entity': 'All entities', **{f: sum(c[f] for c in checks) for f in ('processed_events', 'matched_v1_gwei_events', 'unmatched_events')}}]
    s['manual_labels'] = [m for m in s.get('manual_labels', []) if m['label'] in keep]

    s['network'] = [{k: e[k] for k in NETWORK_FIELDS if k in e} for e in s['network']]
    s['gaps'] = []  # the site reads coverage_rows; gaps carry raw slot overviews
    s['files'] = []
    for day in s['days']:
        day['balances'] = None
    s['runs'] = [{k: r[k] for k in RUN_FIELDS if k in r} for r in s['runs']]
    s['key_usage'] = []
    s['validation'].pop('api_access', None)

    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(s, f, separators=(',', ':'))
    print(f'{len(keep)} named entities: {", ".join(sorted(keep))}', file=sys.stderr)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
