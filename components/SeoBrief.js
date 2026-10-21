"use client";
import { useState } from "react";
import { copyText } from "../lib/format";

// Comma-separated list; commas inside parentheses stay, e.g.
// "Befüllung (Schokolade, Bio, vegan)" is one entry.
const split = (s) => (s || "").split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean);

// The SEO brief for one page: everything a writer needs, in the order
// they need it. Each block can be copied in one click.
export default function SeoBrief({ item }) {
  const [copied, setCopied] = useState(null);
  async function copy(id, text) {
    await copyText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  }
  const CopyBtn = ({ id, text, label = "kopieren" }) => (
    <button className="copy-btn" onClick={() => copy(id, text)} disabled={!text}>
      {copied === id ? "kopiert ✓" : label}
    </button>
  );

  const secondary = split(item.secondaryKeywords);
  const product = split(item.productKeywords);
  const longtail = split(item.longtailKeywords);
  const topics = split(item.topics);
  const links = item.links || [];
  const allKeywords = [item.mainKeyword, ...secondary, ...product, ...longtail].filter(Boolean).join("\n");
  const allLinks = links.map((l) => (l.url ? `${l.label}: ${l.url}` : l.label)).join("\n");

  if (!item.mainKeyword && !longtail.length && !links.length) return null;

  return (
    <div className="brief">
      {item.writerNote && (
        <div className="brief-note">
          <b>Hinweis:</b> {item.writerNote}
        </div>
      )}

      <section className="brief-block">
        <div className="brief-head">
          <h5>Haupt-Keyword</h5>
          <CopyBtn id="main" text={item.mainKeyword} />
        </div>
        <div className="brief-main">{item.mainKeyword || "—"}</div>
        <p className="brief-help">Gehört in Seitentitel, H1 und den ersten Absatz.</p>
      </section>

      {(secondary.length > 0 || product.length > 0) && (
        <section className="brief-block">
          <div className="brief-head">
            <h5>Weitere Keywords</h5>
            <CopyBtn id="all-kw" text={allKeywords} label="alle Keywords kopieren" />
          </div>
          {secondary.length > 0 && (
            <div className="chips">
              {secondary.map((k) => (
                <span className="chip chip-strong" key={k}>
                  {k}
                </span>
              ))}
            </div>
          )}
          {product.length > 0 && (
            <>
              <p className="brief-help">Produkt-Keywords – in Zwischenüberschriften und Produktbeschreibungen verteilen:</p>
              <div className="chips">
                {product.map((k) => (
                  <span className="chip" key={k}>
                    {k}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {longtail.length > 0 && (
        <section className="brief-block">
          <div className="brief-head">
            <h5>Long-Tail-Keywords</h5>
            <CopyBtn id="long" text={longtail.join("\n")} />
          </div>
          <p className="brief-help">Gut für Zwischenüberschriften und FAQ-Fragen:</p>
          <ul className="brief-list">
            {longtail.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>
      )}

      {topics.length > 0 && (
        <section className="brief-block">
          <div className="brief-head">
            <h5>Themen für den Text</h5>
            <CopyBtn id="topics" text={topics.join("\n")} />
          </div>
          <ul className="brief-list">
            {topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {links.length > 0 && (
        <section className="brief-block">
          <div className="brief-head">
            <h5>Interne Links ({links.length})</h5>
            <CopyBtn id="links" text={allLinks} label="alle Links kopieren" />
          </div>
          <p className="brief-help">Im Text als Link auf diese Seiten setzen:</p>
          <ul className="brief-links">
            {links.map((l, i) => (
              <li key={i}>
                {l.url ? (
                  <>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                    <button className="copy-btn" onClick={() => copy(`link-${i}`, l.url)}>
                      {copied === `link-${i}` ? "✓" : "URL"}
                    </button>
                  </>
                ) : (
                  <span title="Keine passende Seite gefunden – als Thema verwenden">{l.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
