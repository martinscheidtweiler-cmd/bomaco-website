'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
} from 'lucide-react'

import { supabase } from './lib/supabaseClient'

type Lang = 'nl' | 'fr' | 'en'

type EventItem = {
  id: string
  title: string
  event_date: string
  start_time: string | null
  location: string | null
  description_nl: string | null
  description_fr: string | null
  description_en: string | null
  signup_url: string | null
  status: string | null
}

const translations = {
  nl: {
    navCalendar: 'Kalender',
    navInfo: 'Info',
    navContact: 'Contact',
    navSignup: 'Inschrijven',
    heroTitle: 'BOMACO',
    heroSubtitle: 'Winter Jumping',
    heroText:
      'Wedstrijden en trainingsdagen op de Bomaco-site in Asse. Bekijk de kalender, praktische info en schrijf rechtstreeks in.',
    viewCalendar: 'Bekijk kalender',
    practicalInfo: 'Praktische info',
    nextEvent: 'Volgende wedstrijd',
    calendarLabel: 'Kalender',
    comingEvents: 'Volgende\nevenementen',
    fullCalendar: 'Volledige kalender',
    open: 'Open',
    full: 'Volzet',
    signup: 'Inschrijven',
    locationContact: 'Locatie & contact',
    locationTitle: 'Bomaco-site\nAsse',
    noEvents: 'Nog geen evenementen toegevoegd.',
    footer: 'Asse · Indoor jumping events',
    footerAddress: 'Z.3 Doornveld 50\n1731 Asse',
    footerContact: 'Dieleman Marc\n0477 900 369',
    footerLinks: 'Navigatie',
    footerLegal: '© 2026 Bomaco',
    footerCredit: 'Design by MS Webdesign',
  },
  fr: {
    navCalendar: 'Calendrier',
    navInfo: 'Infos',
    navContact: 'Contact',
    navSignup: 'Inscription',
    heroTitle: 'BOMACO',
    heroSubtitle: 'Winter Jumping',
    heroText:
      "Concours et journées d’entraînement sur le site Bomaco à Asse. Consultez le calendrier, les infos pratiques et inscrivez-vous directement.",
    viewCalendar: 'Voir le calendrier',
    practicalInfo: 'Infos pratiques',
    nextEvent: 'Prochain concours',
    calendarLabel: 'Calendrier',
    comingEvents: 'Prochains\névénements',
    fullCalendar: 'Calendrier complet',
    open: 'Ouvert',
    full: 'Complet',
    signup: "S'inscrire",
    locationContact: 'Lieu & contact',
    locationTitle: 'Site Bomaco\nAsse',
    noEvents: 'Aucun événement ajouté.',
    footer: 'Asse · Événements indoor jumping',
    footerAddress: 'Z.3 Doornveld 50\n1731 Asse',
    footerContact: 'Dieleman Marc\n0477 900 369',
    footerLinks: 'Navigation',
    footerLegal: '© 2026 Bomaco',
    footerCredit: 'Design by MS Webdesign',
  },
  en: {
    navCalendar: 'Calendar',
    navInfo: 'Info',
    navContact: 'Contact',
    navSignup: 'Enter now',
    heroTitle: 'BOMACO',
    heroSubtitle: 'Winter Jumping',
    heroText:
      'Competitions and training days at the Bomaco site in Asse. View the calendar, practical info and enter directly.',
    viewCalendar: 'View calendar',
    practicalInfo: 'Practical info',
    nextEvent: 'Next competition',
    calendarLabel: 'Calendar',
    comingEvents: 'Upcoming\nevents',
    fullCalendar: 'Full calendar',
    open: 'Open',
    full: 'Full',
    signup: 'Enter',
    locationContact: 'Location & contact',
    locationTitle: 'Bomaco site\nAsse',
    noEvents: 'No events added yet.',
    footer: 'Asse · Indoor jumping events',
    footerAddress: 'Z.3 Doornveld 50\n1731 Asse',
    footerContact: 'Dieleman Marc\n0477 900 369',
    footerLinks: 'Navigation',
    footerLegal: '© 2026 Bomaco',
    footerCredit: 'Design by MS Webdesign',
  },
}

function localeForLang(lang: Lang) {
  if (lang === 'fr') return 'fr-BE'
  if (lang === 'en') return 'en-GB'
  return 'nl-BE'
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('nl')

  useEffect(() => {
    const savedLang = localStorage.getItem('bomaco-lang') as Lang | null
    if (savedLang) setLang(savedLang)
  }, [])

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  const t = translations[lang]

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('visible', true)
        .order('event_date', { ascending: true })
        .limit(3)

      if (!error) setEvents(data || [])
      setLoading(false)
    }
    loadEvents()
  }, [])

  function getDescription(event: EventItem) {
    if (lang === 'fr') return event.description_fr || event.description_nl || ''
    if (lang === 'en') return event.description_en || event.description_nl || ''
    return event.description_nl || ''
  }

  const nextEvent = events[0]

  const tickerWords = ['BOMACO', '·', 'WINTER JUMPING', '·', 'ASSE', '·', 'INDOOR JUMPING', '·']

  return (
    <main className="site-page">
      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <nav className="navbar">
        <a href="/" className="nav-brand">
          <span>BOMACO</span>
          <small>Winter Jumping</small>
        </a>

        <div className="nav-links">
          <a href="/kalender">{t.navCalendar}</a>
          <a href="/info">{t.navInfo}</a>
          <a href="#contact">{t.navContact}</a>
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
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          <a href="/kalender" className="nav-button">{t.navSignup}</a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline>
          <source
            src="https://rdbaqsmnbacfnspzigfg.supabase.co/storage/v1/object/public/Home/Winterjumping%20KRISMAR%20VIDEO.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-overlay" />

        <div className="hero-inner">
          <div className="hero-logo-title">
            <strong>{t.heroTitle}</strong>
            <span>{t.heroSubtitle}</span>
          </div>
          <p>{t.heroText}</p>
          <div className="hero-actions">
            <a href="/kalender" className="btn-red">
              {t.viewCalendar}
              <ArrowRight size={17} />
            </a>
            <a href="/info" className="btn-white">{t.practicalInfo}</a>
          </div>
        </div>

        {nextEvent && (
          <div className="hero-card">
            <strong>{t.nextEvent}</strong>
            <h3>{nextEvent.title}</h3>
            <div className="hero-card-info">
              <span>
                <CalendarDays size={15} />
                {new Date(nextEvent.event_date + 'T12:00:00').toLocaleDateString(
                  localeForLang(lang),
                  { day: '2-digit', month: 'long', year: 'numeric' }
                )}
              </span>
              {nextEvent.start_time && (
                <span><Clock3 size={15} />{nextEvent.start_time}</span>
              )}
              {nextEvent.location && (
                <span><MapPin size={15} />{nextEvent.location}</span>
              )}
            </div>
            {nextEvent.signup_url && (
              <a href={nextEvent.signup_url} target="_blank" className="hero-card-button">
                {t.signup}
                <ArrowRight size={15} />
              </a>
            )}
          </div>
        )}
      </section>

      {/* ── TICKER ───────────────────────────────────────────── */}
      <div className="ticker-strip" aria-hidden="true">
        <div className="ticker-track">
          {Array.from({ length: 4 }).map((_, groupIdx) => (
            tickerWords.map((word, wordIdx) => (
              <span key={`${groupIdx}-${wordIdx}`} className="ticker-item">
                {word === '·' ? <span className="ticker-dot">·</span> : word}
              </span>
            ))
          ))}
        </div>
      </div>

      {/* ── EVENTS ───────────────────────────────────────────── */}
      <section className="calendar-section">
        <div className="section-heading">
          <div className="section-heading-left">
            <span>{t.calendarLabel}</span>
            <h2>
              {t.comingEvents.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </h2>
          </div>
        </div>

        <div className="events-list">
          {!loading && events.length === 0 && (
            <div className="empty-card">{t.noEvents}</div>
          )}

          {events.map((event) => {
            const d = new Date(event.event_date + 'T12:00:00')
            const dayNum = d.getDate()
            const monthStr = d.toLocaleDateString(localeForLang(lang), { month: 'short' }).toUpperCase()

            return (
              <article className="event-row" key={event.id}>
                {/* Large date */}
                <div className="event-date">
                  <strong>{dayNum}</strong>
                  <span>{monthStr}</span>
                </div>

                {/* Vertical divider */}
                <div className="event-divider" />

                {/* Content */}
                <div className="event-content">
                  <h3>{event.title}</h3>
                  <div className="event-meta">
                    {event.start_time && (
                      <span><Clock3 size={14} />{event.start_time}</span>
                    )}
                    {event.location && (
                      <span><MapPin size={14} />{event.location}</span>
                    )}
                  </div>
                  {getDescription(event) && <p>{getDescription(event)}</p>}
                </div>

                {/* Action */}
                <div className="event-action">
                  <span className={`event-status ${event.status || ''}`}>
                    {event.status === 'full' ? t.full : t.open}
                  </span>
                  {event.signup_url && event.status !== 'full' && (
                    <a href={event.signup_url} target="_blank" className="signup-link">
                      {t.signup}
                      <ArrowRight size={15} />
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="calendar-more">
          <a href="/kalender">
            {t.fullCalendar}
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <section className="info-section" id="contact">
        <div className="contact-wrapper">
          <div className="contact-left">
            <span>{t.locationContact}</span>
            <h2>
              {t.locationTitle.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </h2>
            <div className="contact-info-grid">
              <div className="contact-info-card">
                <strong>WINTERJUMPING vzw</strong>
                <p>Bomaco-site</p>
                <p>Z.3 Doornveld 50</p>
                <p>1731 Asse</p>
              </div>
              <div className="contact-info-card">
                <strong>Contact</strong>
                <p>Dieleman Marc</p>
                <p>
                  <a href="tel:+32477900369">0477 900 369</a>
                </p>
              </div>
            </div>
          </div>

          <div className="map-card">
            <iframe
              src="https://www.google.com/maps?q=Z.3%20Doornveld%2050%201731%20Asse&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Bomaco locatie"
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-brand">
          <strong>BOMACO</strong>
          <span>Winter Jumping</span>
        </div>

        <div>
          <div className="footer-col-title">Adres</div>
          <div className="footer-col-body">
            Bomaco-site<br />
            Z.3 Doornveld 50<br />
            1731 Asse<br />
            <a href="tel:+32477900369">0477 900 369</a>
          </div>
        </div>

        <div>
          <div className="footer-col-title">{t.footerLinks}</div>
          <div className="footer-col-body">
            <a href="/kalender" style={{ display: 'block', marginBottom: 6 }}>{t.navCalendar}</a>
            <a href="/info" style={{ display: 'block', marginBottom: 6 }}>{t.navInfo}</a>
            <a href="#contact" style={{ display: 'block' }}>{t.navContact}</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{t.footerLegal}</span>
          <a href="https://mswebdesign.be" target="_blank">{t.footerCredit}</a>
        </div>
      </footer>
    </main>
  )
}
