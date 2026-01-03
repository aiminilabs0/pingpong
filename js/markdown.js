/**
 * Tiny Markdown renderer for rubber details.
 * Supports: headings, horizontal rules, paragraphs, lists, inline code, links, bold/italic, and simple tables.
 * No HTML input is trusted: we always escape then inject only our own tags.
 */

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function safeHref(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    try {
        const u = new URL(s, typeof location !== 'undefined' ? location.href : 'https://example.invalid/');
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u.toString();
    } catch {
        return null;
    }
}

function renderInline(raw) {
    const codeSpans = [];
    let s = String(raw ?? '');

    // Code spans first (so we don't apply emphasis/link parsing inside).
    s = s.replace(/`([^`]+)`/g, (_, code) => {
        const idx = codeSpans.push(code) - 1;
        return `\u0000C${idx}\u0000`;
    });

    // Links: [text](url)
    let out = '';
    let last = 0;
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    for (let m; (m = linkRe.exec(s)); ) {
        out += escapeHtml(s.slice(last, m.index));
        const label = escapeHtml(m[1]);
        const href = safeHref(m[2]);
        out += href
            ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
            : label;
        last = m.index + m[0].length;
    }
    out += escapeHtml(s.slice(last));

    // Bold then italic (simple, best-effort).
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

    // Restore code spans.
    out = out.replace(/\u0000C(\d+)\u0000/g, (_, n) => {
        const code = codeSpans[Number(n)] ?? '';
        return `<code>${escapeHtml(code)}</code>`;
    });
    return out;
}

function splitTableRow(line) {
    // Trim outer pipes if present, then split.
    let s = String(line ?? '').trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => String(c ?? '').trim());
}

function isTableSep(line) {
    // Matches: | --- | ---: | :---: |
    const s = String(line ?? '').trim();
    return /^\|?\s*:?-+\s*:?\s*(\|\s*:?-+\s*:?\s*)+\|?\s*$/.test(s);
}

function parseTableAlign(sepLine, colCount) {
    const cols = splitTableRow(sepLine);
    const align = [];
    for (let i = 0; i < colCount; i++) {
        const c = (cols[i] ?? '').trim();
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        if (left && right) align.push('center');
        else if (right) align.push('right');
        else if (left) align.push('left');
        else align.push(null);
    }
    return align;
}

function renderMarkdown(md) {
    const lines = String(md ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
    const out = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i] ?? '';
        const trimmed = line.trim();

        // Skip extra blank lines
        if (!trimmed) {
            i++;
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
            out.push('<hr/>');
            i++;
            continue;
        }

        // Headings
        const h = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (h) {
            const level = h[1].length;
            out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
            i++;
            continue;
        }

        // Fenced code block
        if (trimmed.startsWith('```')) {
            const fence = trimmed;
            i++;
            const buf = [];
            while (i < lines.length && (lines[i] ?? '').trim() !== fence) {
                buf.push(lines[i] ?? '');
                i++;
            }
            if (i < lines.length) i++; // consume closing fence
            out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
            continue;
        }

        // Table (header + separator + rows)
        if (trimmed.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1] ?? '')) {
            const header = splitTableRow(lines[i]);
            const align = parseTableAlign(lines[i + 1], header.length);
            i += 2;
            const rows = [];
            while (i < lines.length) {
                const rowLine = lines[i] ?? '';
                if (!rowLine.trim() || !rowLine.includes('|')) break;
                rows.push(splitTableRow(rowLine));
                i++;
            }

            const ths = header
                .map((c, idx) => {
                    const a = align[idx] ? ` style="text-align:${align[idx]}"` : '';
                    return `<th${a}>${renderInline(c)}</th>`;
                })
                .join('');
            const trs = rows
                .map((r) => {
                    const tds = header
                        .map((_, idx) => {
                            const a = align[idx] ? ` style="text-align:${align[idx]}"` : '';
                            return `<td${a}>${renderInline(r[idx] ?? '')}</td>`;
                        })
                        .join('');
                    return `<tr>${tds}</tr>`;
                })
                .join('');
            out.push(`<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`);
            continue;
        }

        // Lists
        const isUl = /^\s*[-*]\s+/.test(line);
        const isOl = /^\s*\d+\.\s+/.test(line);
        if (isUl || isOl) {
            const tag = isOl ? 'ol' : 'ul';
            const items = [];
            while (i < lines.length) {
                const l = lines[i] ?? '';
                const m = isOl ? l.match(/^\s*\d+\.\s+(.+)$/) : l.match(/^\s*[-*]\s+(.+)$/);
                if (!m) break;
                items.push(`<li>${renderInline(m[1])}</li>`);
                i++;
            }
            out.push(`<${tag}>${items.join('')}</${tag}>`);
            continue;
        }

        // Paragraph (consume until blank line)
        const buf = [];
        while (i < lines.length && (lines[i] ?? '').trim()) {
            buf.push(lines[i] ?? '');
            i++;
        }
        out.push(`<p>${renderInline(buf.join(' '))}</p>`);
    }

    return out.join('\n');
}

export { renderMarkdown };


