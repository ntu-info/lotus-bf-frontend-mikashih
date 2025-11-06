import { API_BASE } from '../api'
import { useEffect, useMemo, useState } from 'react'

function classNames (...xs) { return xs.filter(Boolean).join(' ') }

export function Studies ({ query }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [sortKey, setSortKey] = useState('year')
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => { setPage(1) }, [query])

  useEffect(() => {
    if (!query) return
    let alive = true
    const ac = new AbortController()
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const url = `${API_BASE}/query/${encodeURIComponent(query)}/studies`
        const res = await fetch(url, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!alive) return
        const list = Array.isArray(data?.results) ? data.results : []
        setRows(list)
      } catch (e) {
        if (!alive) return
        // Show empty list message in content area instead of an error banner
        setErr('')
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false; ac.abort() }
  }, [query])

  const changeSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...rows]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const A = a?.[sortKey]
      const B = b?.[sortKey]
      // Numeric comparison for year; string comparison for other fields
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir
      return String(A || '').localeCompare(String(B || ''), 'en') * dir
    })
    return arr
  }, [rows, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className='flex flex-col rounded-2xl border'>
      {query && loading && (
        <div className='grid gap-3 p-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded-lg bg-gray-100' />
          ))}
        </div>
      )}

      {query && err && (
        <div className='mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {err}
        </div>
      )}

      {!loading && !err && (
        <div className='p-3'>
          {/* local styles to ensure consistent look without Tailwind */}
          <style>{`
            .paper-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
            .paper-card { 
              position: relative; 
              background: #fbfcff; 
              border: 1px solid var(--border); 
              border-radius: 16px; 
              padding: 16px 18px 52px 18px; 
              box-shadow: 0 1px 0 rgba(0,0,0,0.02);
              transition: all 0.2s ease;
              cursor: pointer;
            }
            .paper-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border-color: #c7d2fe;
            }
            .paper-title-lg { font-weight: 800; font-size: 22px; color: #0f172a; line-height: 1.35; margin: 0 72px 8px 0; }
            .paper-year { position: absolute; top: 14px; right: 14px; background: #eef2ff; color: #3730a3; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 14px; }
            .paper-row { display: flex; gap: 10px; align-items: baseline; margin-top: 8px; }
            .paper-label { color: #0f172a; font-weight: 700; min-width: 52px; }
            .paper-authors { color: #111827; }
            .paper-journal { color: #374151; font-style: italic; }
            .paper-id { color: #1d4ed8; text-decoration: none; font-weight: 700; }
            .paper-id:hover { text-decoration: underline; }
            .paper-contrast { color: #6b7280; margin-left: 6px; }
            .paper-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: var(--muted); }
            .paper-sortbtn { background: #fff; border: 1px solid var(--border); padding: 4px 8px; border-radius: 8px; }
            .paper-pubmed { position: absolute; right: 16px; bottom: 12px; background: #eef2ff; color: #1d4ed8; font-weight: 700; font-size: 12px; padding: 6px 10px; border-radius: 10px; text-decoration: none; }
            .paper-pubmed:hover { text-decoration: underline; }
            /* quick fade-in-up animation for cards */
            .paper-anim { opacity: 0; animation: paperFade .28s ease-out forwards; }
            @keyframes paperFade {
              0%   { opacity: 0; transform: translateY(6px); filter: saturate(0.96); }
              100% { opacity: 1; transform: translateY(0);   filter: saturate(1); }
            }
          `}</style>

          {/* Sort controls - only show when query exists */}
          {query && (
            <div className='paper-toolbar'>
              <div>共 <b>{sorted.length}</b> 筆</div>
              <div className='flex items-center gap-2'>
                {[
                  { key: 'year', label: 'Year' },
                  { key: 'journal', label: 'Journal' },
                  { key: 'title', label: 'Title' },
                  { key: 'authors', label: 'Authors' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className='paper-sortbtn'
                    title={`Sort by ${label}`}
                    onClick={() => changeSort(key)}
                  >
                    {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card grid - only render when query exists */}
          {!query ? (
            <div className='px-1 py-4 text-gray-500'>請在上方輸入查詢以顯示研究結果</div>
          ) : pageRows.length === 0 ? (
            <div className='px-1 py-4 text-gray-500'>No data</div>
          ) : (
            <div className='paper-grid'>
              {pageRows.map((r, i) => {
                const studyId = r.study_id ?? r.id ?? r.pmid ?? ''
                const nContrasts = r.contrast ?? r.contrasts ?? r.n_contrasts ?? r.nContrasts ?? null
                const yearBadge = r.year ? <span className='paper-year'>{r.year}</span> : null
                return (
                  <article
                    key={i}
                    className='paper-card paper-anim'
                    style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  >
                    {yearBadge}
                    <h3 className='paper-title-lg'>{r.title || ''}</h3>
                    {r.authors ? (
                      <div className='paper-row'>
                        <span className='paper-label'>作者：</span>
                        <span className='paper-authors'>{r.authors}</span>
                      </div>
                    ) : null}
                    {r.journal ? (
                      <div className='paper-row'>
                        <span className='paper-label'>期刊：</span>
                        <em className='paper-journal'>{r.journal}</em>
                      </div>
                    ) : null}
                    {(studyId || nContrasts!=null) && (
                      <div className='paper-row'>
                        {studyId ? (
                          <>
                            <span className='paper-label'>Study ID：</span>
                            <a href="#" className='paper-id' aria-label={`Study ${studyId}`}>{String(studyId)}</a>
                            {nContrasts!=null && <span className='paper-contrast'>/ Contrast: {nContrasts}</span>}
                          </>
                        ) : (
                          <>
                            <span className='paper-label'>Study：</span>
                            <span className='paper-authors'>N/A{nContrasts!=null && <span className='paper-contrast'> / Contrast: {nContrasts}</span>}</span>
                          </>
                        )}
                      </div>
                    )}
                    {studyId ? (
                      <a
                        className='paper-pubmed'
                        href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(studyId)}/`}
                        target='_blank'
                        rel='noopener noreferrer'
                        title='Open on PubMed'
                      >
                        PubMed ↗
                      </a>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!loading && !err && query && sorted.length > 0 && (
        <div className='flex items-center justify-between border-t p-3 text-sm'>
          <div>Total <b>{sorted.length}</b> records, page <b>{page}</b>/<b>{totalPages}</b></div>
          <div className='flex items-center gap-2'>
            <button disabled={page <= 1} onClick={() => setPage(1)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏮</button>
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className='rounded-lg border px-2 py-1 disabled:opacity-40'>Next</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className='rounded-lg border px-2 py-1 disabled:opacity-40'>⏭</button>
          </div>
        </div>
      )}
    </div>
  )
}

