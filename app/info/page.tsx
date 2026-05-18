'use client'

import { useEffect, useState } from 'react'
import { FileText, Globe, MapPin, Phone } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type Lang = 'nl' | 'fr' | 'en'

type Regulation = {
  id: string
  title_nl: string | null
  title_fr: string | null
  title_en: string | null
  file_url_nl: string | null
  file_url_fr: string | null
  file_url_en: string | null
  visible: boolean | null
}

type SiteContent = {
  info_nl: string | null
  info_fr: string | null
  info_en: string | null
}

const translations = {
  nl: {
    calendar: 'Kalender',
    info: 'Info',
    contact: 'Contact',
    home: 'Home',
    title: 'Praktische informatie',
    regulations: 'Reglementen',
    noRegulations: 'Nog geen reglementen toegevoegd.',
    loading: 'Laden...',
  },
  fr: {
    calendar: 'Calendrier',
    info: 'Infos',
    contact: 'Contact',
    home: 'Accueil',
    title: 'Informations pratiques',
    regulations: 'Règlements',
    noRegulations: 'Aucun règlement ajouté.',
    loading: 'Chargement...',
  },
  en: {
    calendar: 'Calendar',
    info: 'Info',
    contact: 'Contact',
    home: 'Home',
    title: 'Practical information',
    regulations: 'Regulations',
    noRegulations: 'No regulations added yet.',
    loading: 'Loading...',
  },
}

export default function InfoPage() {
  const [lang, setLang] = useState<Lang>('nl')

    useEffect(() => {
    const savedLang = localStorage.getItem('bomaco-lang') as Lang | null

    if (savedLang) {
        setLang(savedLang)
    }
    }, [])
  const [content, setContent] = useState<SiteContent | null>(null)
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)

  const t = translations[lang]

  useEffect(() => {
    async function loadData() {
      const [{ data: siteContent }, { data: rules }] = await Promise.all([
        supabase.from('site_content').select('*').eq('id', 'main').single(),
        supabase
          .from('regulations')
          .select('*')
          .eq('visible', true)
          .order('created_at', { ascending: false }),
      ])

      if (siteContent) setContent(siteContent)
      setRegulations(rules || [])
      setLoading(false)
    }

    loadData()
  }, [])

  function getText() {
    if (!content) return ''
    if (lang === 'fr') return content.info_fr || content.info_nl || ''
    if (lang === 'en') return content.info_en || content.info_nl || ''
    return content.info_nl || ''
  }

  function getRuleTitle(rule: Regulation) {
    if (lang === 'fr') return rule.title_fr || rule.title_nl || ''
    if (lang === 'en') return rule.title_en || rule.title_nl || ''
    return rule.title_nl || ''
  }

  function getRuleUrl(rule: Regulation) {
    if (lang === 'fr') return rule.file_url_fr || rule.file_url_nl || ''
    if (lang === 'en') return rule.file_url_en || rule.file_url_nl || ''
    return rule.file_url_nl || ''
  }

  const visibleRules = regulations.filter((rule) => getRuleUrl(rule))

  return (
    <main className="sub-page info-page">
      <nav className="navbar">
        <a href="/" className="nav-brand">
          <span>BOMACO</span>
          <small>Winter Jumping</small>
        </a>

        <div className="nav-links">
          <a href="/kalender">{t.calendar}</a>
          <a href="/info">{t.info}</a>
          <a href="/#contact">{t.contact}</a>
        </div>

        <div className="nav-right">
          <div className="language-switch">
            {(['nl', 'fr', 'en'] as Lang[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                    setLang(item)
                    localStorage.setItem('bomaco-lang', item)
                }}
                className={lang === item ? 'active' : ''}
              >
                {item === 'nl' && <Globe size={14} />}
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <a href="/" className="nav-button">
            {t.home}
          </a>
        </div>
      </nav>

      <section className="info-hero">
        <span>BOMACO</span>
        <h1>{t.title}</h1>
      </section>

      <section className="info-layout">
        <div className="info-main-card">
          {loading ? (
            <p>{t.loading}</p>
          ) : (
            <div className="info-rich-text">
              {getText()
                .split('\n')
                .map((line, index) => {
                  if (!line.trim()) return <br key={index} />

                  if (line.startsWith('http')) {
                    return (
                      <a
                        key={index}
                        href={line}
                        target="_blank"
                        className="info-link"
                      >
                        {line}
                      </a>
                    )
                  }

                  return <p key={index}>{line}</p>
                })}
            </div>
          )}
        </div>

        <aside className="info-sidebar">
          <div className="info-contact-card">
            <span>Contact</span>

            <h3>Winterjumping vzw</h3>

            <div className="info-contact-item">
              <MapPin size={18} />
              <div>
                Bomaco-site
                <br />
                Z.3 Doornveld 50
                <br />
                1731 Asse
              </div>
            </div>

            <div className="info-contact-item">
              <Phone size={18} />
              <div>
                Dieleman Marc
                <br />
                0477 900 369
              </div>
            </div>
          </div>

          <div className="info-rules-card">
            <span>{t.regulations}</span>

            <div className="rules-list">
              {!loading && visibleRules.length === 0 && (
                <p className="rules-empty">{t.noRegulations}</p>
              )}

              {visibleRules.map((rule) => (
                <a
                  key={rule.id}
                  href={getRuleUrl(rule)}
                  target="_blank"
                  className="rule-item"
                >
                  <div>
                    <FileText size={18} />
                  </div>

                  <strong>{getRuleTitle(rule)}</strong>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>
      <footer className="site-footer">
        <span>© 2026 Bomaco</span>
        <span>Design by MS Webdesign</span>
      </footer>
    </main>
  )
}