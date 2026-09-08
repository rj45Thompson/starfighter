"""fetch_kaggle_art.py - pull generated images out of a finished Kaggle job.

Two traps this exists to absorb, both hit on 2026-09-07:

1. The MCP job record keeps only the LAST 4000 characters of stdout, so a printed base64 payload is not in it.
   The bytes live in the kernel's own log, which has to be downloaded from Kaggle.
2. `KaggleApi.kernels_output` writes that log with the process default encoding, which is cp1252 on this machine,
   and dies with UnicodeEncodeError on the first non-Latin-1 character. Running under PYTHONUTF8=1 fixes it; this
   script sets UTF-8 mode itself so the caller does not have to remember.

The log is a JSON stream of {stream_name, time, data} records, so the job's stdout has to be reassembled from the
`data` fields before the RESULT_JSON marker can be found.

Usage:
    py fetch_kaggle_art.py <job-slug> --out-dir <dir> [--user rjthompson]
"""
import argparse, base64, json, os, re, sys

if os.environ.get('PYTHONUTF8') != '1':                      # re-exec in UTF-8 mode, see trap 2
    os.environ['PYTHONUTF8'] = '1'
    os.execv(sys.executable, [sys.executable] + sys.argv)


def stdout_of(log_path):
    raw = open(log_path, encoding='utf-8', errors='replace').read()
    try:
        recs = json.loads(raw)
    except Exception:
        recs = [json.loads(m) for m in re.findall(r'\{"stream_name".*?\}(?=\n,|\n\]|\Z)', raw, re.S)]
    return ''.join(r.get('data', '') for r in recs if isinstance(r, dict))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--user', default='rjthompson')
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--keep-log', action='store_true')
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi(); api.authenticate()
    api.kernels_output('%s/%s' % (args.user, args.slug), path=args.out_dir)
    log = os.path.join(args.out_dir, args.slug + '.log')
    if not os.path.exists(log):
        cands = [f for f in os.listdir(args.out_dir) if f.endswith('.log')]
        if not cands:
            sys.exit('no log downloaded for ' + args.slug)
        log = os.path.join(args.out_dir, cands[0])

    out = stdout_of(log)
    i = out.find('RESULT_JSON_BEGIN')
    if i < 0:
        # No marker means the job did not reach its own end. Show why rather than reporting an empty result.
        tail = '\n'.join(l for l in out.splitlines() if l.strip())[-2000:]
        sys.exit('RESULT_JSON_BEGIN not found - the job did not finish. Tail:\n' + tail)
    js = out[i + len('RESULT_JSON_BEGIN'):]
    js = js[js.find('{'):]
    data, _ = json.JSONDecoder().raw_decode(js)

    for name, v in data.items():
        p = os.path.join(args.out_dir, name + '.jpg')
        open(p, 'wb').write(base64.b64decode(v.pop('jpeg_b64')))
        bits = ' '.join('%s=%s' % (k, v[k]) for k in sorted(v))
        print('%-12s %7.1f KB  %s' % (name, os.path.getsize(p) / 1024, bits))
    if not args.keep_log:
        os.remove(log)


if __name__ == '__main__':
    main()
