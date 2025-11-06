export function QueryBuilder({ query, setQuery }) {
  const append = (token) => setQuery((q) => (q ? `${q} ${token}` : token));

  // --- tokenization helpers ---
  const trimSpaces = (s) => s.replace(/\s+/g, ' ').trim();
  const isOp = (t) => t === 'AND' || t === 'OR' || t === 'NOT' || t === '(' || t === ')';
  const isCoord = (t) => /\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\]/.test(t);
  function tokenize(str) {
    const out = [];
    let i = 0;
    const n = str?.length || 0;
    while (i < n) {
      // skip spaces
      if (str[i].match(/\s/)) { i++; continue }
      // coordinates in brackets
      if (str[i] === '[') {
        const j = str.indexOf(']', i + 1);
        if (j !== -1) {
          const tok = str.slice(i, j + 1);
          out.push(tok);
          i = j + 1;
          continue;
        }
      }
      // normal token until next space
      let j = i + 1;
      while (j < n && !/\s/.test(str[j])) j++;
      out.push(str.slice(i, j));
      i = j;
    }
    return out.filter(Boolean);
  }
  function classify(tok) {
    if (isOp(tok)) return { type: 'op', v: tok };
    if (isCoord(tok)) return { type: 'term', v: tok };
    return { type: 'term', v: tok };
  }
  function joinTokens(tokens) {
    return trimSpaces(tokens.map(t => t.v).join(' '));
  }

  const rawTokens = tokenize(query || '');
  const tokens = rawTokens.map(classify);

  const isBinaryOp = (t) => t?.type === 'op' && (t.v === 'AND' || t.v === 'OR');
  const isUnaryNot = (t) => t?.type === 'op' && t.v === 'NOT';
  const isLParen = (t) => t?.type === 'op' && t.v === '(';
  const isRParen = (t) => t?.type === 'op' && t.v === ')';

  function cleanupTokens(arr) {
    if (!arr || !arr.length) return [];
    let changed = true;
    while (changed) {
      changed = false;
      // remove empty parens: ()
      for (let i = 0; i < arr.length - 1; i++) {
        if (isLParen(arr[i]) && isRParen(arr[i + 1])) {
          arr.splice(i, 2); changed = true; break;
        }
      }
      if (changed) continue;
      // remove leading binary/unary ops (except '(')
      while (arr.length && arr[0].type === 'op' && arr[0].v !== '(') { arr.shift(); changed = true; }
      // remove trailing binary/unary ops (except ')')
      while (arr.length && arr[arr.length - 1].type === 'op' && arr[arr.length - 1].v !== ')') { arr.pop(); changed = true; }
      if (changed) continue;
      // collapse adjacent ops (e.g., AND OR) by removing the latter
      for (let i = 1; i < arr.length; i++) {
        if (arr[i - 1].type === 'op' && arr[i].type === 'op' && !isLParen(arr[i]) && !isRParen(arr[i - 1])) {
          arr.splice(i, 1); changed = true; break;
        }
      }
    }
    return arr;
  }

  const removeTokenAt = (idx) => {
    let arr = tokens.map(t => ({ ...t }));
    if (idx < 0 || idx >= arr.length) return;
    // remove the term
    arr.splice(idx, 1);
    // if a NOT directly precedes removed term, remove it too
    if (idx - 1 >= 0 && isUnaryNot(arr[idx - 1])) {
      arr.splice(idx - 1, 1);
      idx--;
    }
    // remove an adjacent binary op (prefer the one now at idx)
    if (idx < arr.length && isBinaryOp(arr[idx])) {
      arr.splice(idx, 1);
    } else if (idx - 1 >= 0 && isBinaryOp(arr[idx - 1])) {
      arr.splice(idx - 1, 1); idx--;
    }
    // cleanup trivial leftovers
    arr = cleanupTokens(arr);
    setQuery(joinTokens(arr));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setQuery(trimSpaces(e.currentTarget.value));
    }
  };

  return (
    <div className="flex flex-col gap-3 qb">
      {/* Header moved to card container in App.jsx to avoid duplicate titles */}

      {/* Input box with chips inside */}
      <div className="qb__wrap">
        <style>{`
          .qb__wrap { border: 1px solid var(--border); border-radius: 12px; padding: 8px; width: 100%; max-width: 100%; min-width: 0; overflow: hidden; }
          .qb__chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 28px; margin-bottom: 6px; }
          .qb-chip { display: inline-flex; align-items: center; gap: 6px; background: #eef2ff; color: #1e293b; border-radius: 999px; padding: 4px 8px; font-size: 12px; }
          .qb-chip__x { appearance: none; border: none; background: transparent; color: #64748b; cursor: pointer; padding: 0 2px; font-weight: 700; }
          .qb-chip__x:hover { color: #0f172a; }
          .qb__inputbox { width: 100%; max-width: 100%; }
        `}</style>
        <div className="qb__chips">
          {tokens.map((t, idx) => (
            t.type === 'term' ? (
              <span key={idx} className="qb-chip" title={t.v}>
                <span>{t.v}</span>
                <button className="qb-chip__x" aria-label={`remove ${t.v}`} onClick={() => removeTokenAt(idx)}>×</button>
              </span>
            ) : null
          ))}
        </div>
        <div className="qb__inputbox">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Create a query here, e.g.: [-22,-4,18] NOT emotion"
            className="qb__input w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Operators + Reset (single row) */}
      <div className="flex gap-2 flex-nowrap overflow-x-auto">
        {[
          { label: 'AND', onClick: () => append('AND') },
          { label: 'OR', onClick: () => append('OR') },
          { label: 'NOT', onClick: () => append('NOT') },
          { label: '(', onClick: () => append('(') },
          { label: ')', onClick: () => append(')') },
          { label: 'Reset', onClick: () => setQuery('') },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.onClick}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
