'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Globe,
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
    comingEvents: 'Volgende evenementen',

    fullCalendar: 'Volledige kalender bekijken',

    open: 'Open',
    full: 'Volzet',

    signup: 'Inschrijven',

    locationContact: 'Locatie & contact',
    locationTitle: 'Bomaco-site Asse',

    noEvents: 'Nog geen evenementen toegevoegd.',

    footer: 'Asse · Indoor jumping events',
  },

  fr: {
    navCalendar: 'Calendrier',
    navInfo: 'Infos',
    navContact: 'Contact',
    navSignup: 'Inscription',

    heroTitle: 'BOMACO',
    heroSubtitle: 'Winter Jumping',

    heroText:
      'Concours et journées d’entraînement sur le site Bomaco à Asse. Consultez le calendrier, les infos pratiques et inscrivez-vous directement.',

    viewCalendar: 'Voir le calendrier',
    practicalInfo: 'Infos pratiques',

    nextEvent: 'Prochain concours',

    calendarLabel: 'Calendrier',
    comingEvents: 'Prochains événements',

    fullCalendar: 'Voir le calendrier complet',

    open: 'Ouvert',
    full: 'Complet',

    signup: 'S’inscrire',

    locationContact: 'Lieu & contact',
    locationTitle: 'Site Bomaco Asse',

    noEvents: 'Aucun événement ajouté.',

    footer: 'Asse · Événements indoor jumping',
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
    comingEvents: 'Upcoming events',

    fullCalendar: 'View full calendar',

    open: 'Open',
    full: 'Full',

    signup: 'Enter',

    locationContact: 'Location & contact',
    locationTitle: 'Bomaco site Asse',

    noEvents: 'No events added yet.',

    footer: 'Asse · Indoor jumping events',
  },
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('nl')

  useEffect(() => {
    const savedLang = localStorage.getItem('bomaco-lang') as Lang | null

    if (savedLang) {
      setLang(savedLang)
    }
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

      if (!error) {
        setEvents(data || [])
      }

      setLoading(false)
    }

    loadEvents()
  }, [])

  function getDescription(event: EventItem) {
    if (lang === 'fr') {
      return event.description_fr || event.description_nl || ''
    }

    if (lang === 'en') {
      return event.description_en || event.description_nl || ''
    }

    return event.description_nl || ''
  }

  const nextEvent = events[0]

  return (
    <main className="site-page">
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
                {item === 'nl' && <Globe size={14} />}
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <a href="/kalender" className="nav-button">
            {t.navSignup}
          </a>
        </div>
      </nav>

      <section className="hero">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
        >
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
              <ArrowRight size={18} />
            </a>

            <a href="/info" className="btn-white">
              {t.practicalInfo}
            </a>
          </div>
        </div>

        {nextEvent && (
          <div className="hero-card">
            <strong>{t.nextEvent}</strong>

            <h3>{nextEvent.title}</h3>

            <div className="hero-card-info">
              <span>
                <CalendarDays size={16} />

                {new Date(nextEvent.event_date).toLocaleDateString('nl-BE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>

              {nextEvent.start_time && (
                <span>
                  <Clock3 size={16} />
                  {nextEvent.start_time}
                </span>
              )}

              {nextEvent.location && (
                <span>
                  <MapPin size={16} />
                  {nextEvent.location}
                </span>
              )}
            </div>

            {nextEvent.signup_url && (
              <a
                href={nextEvent.signup_url}
                target="_blank"
                className="hero-card-button"
              >
                {t.signup}
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        )}
      </section>

      <section className="calendar-section">
        <div className="section-heading">
          <span>{t.calendarLabel}</span>

          <h2>{t.comingEvents}</h2>
        </div>

        <div className="events-list">
          {!loading && events.length === 0 && (
            <div className="empty-card">
              {t.noEvents}
            </div>
          )}

          {events.map((event) => (
            <article className="event-row" key={event.id}>
              <div className="event-date">
                <CalendarDays size={20} />

                <span>
                  {new Date(event.event_date).toLocaleDateString(
                    lang === 'fr'
                      ? 'fr-BE'
                      : lang === 'en'
                      ? 'en-GB'
                      : 'nl-BE',
                    {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </span>
              </div>

              <div className="event-content">
                <h3>{event.title}</h3>

                <div className="event-meta">
                  {event.start_time && (
                    <span>
                      <Clock3 size={16} />
                      {event.start_time}
                    </span>
                  )}

                  {event.location && (
                    <span>
                      <MapPin size={16} />
                      {event.location}
                    </span>
                  )}
                </div>

                <p>{getDescription(event)}</p>
              </div>

              <div className="event-action">
                <span className={`event-status ${event.status}`}>
                  {event.status === 'full'
                    ? t.full
                    : t.open}
                </span>

                {event.signup_url &&
                  event.status !== 'full' && (
                    <a
                      href={event.signup_url}
                      target="_blank"
                      className="signup-link"
                    >
                      {t.signup}
                      <ArrowRight size={17} />
                    </a>
                  )}
              </div>
            </article>
          ))}
        </div>

        <div className="calendar-more">
          <a href="/kalender">
            {t.fullCalendar}
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <section
        className="info-section"
        id="contact"
      >
        <div className="contact-wrapper">
          <div className="contact-left">
            <span>{t.locationContact}</span>

            <h2>{t.locationTitle}</h2>

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
                  Tel:{' '}
                  <a href="tel:+32477900369">
                    0477 900 369
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="map-card">
            <iframe
              src="https://www.google.com/maps?q=Z.3%20Doornveld%2050%201731%20Asse&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>© 2026 Bomaco</span>
        <a href="https://mswebdesign.be" target="_blank">
          Design by MS Webdesign
        </a>
      </footer>
    </main>
  )
}