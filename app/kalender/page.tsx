'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  MapPin,
} from 'lucide-react'

import { supabase } from '../lib/supabaseClient'

type Lang = 'nl' | 'fr' | 'en'
type ViewMode = 'calendar' | 'list'

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
  startlist_url: string | null
  timing_arena_1: string | null
  timing_arena_2: string | null
  status: string | null
}

const translations = {
  nl: {
    calendar: 'Kalender',
    list: 'Lijst',
    info: 'Info',
    contact: 'Contact',
    home: 'Home',
    title: 'Kalender',
    intro: 'Bekijk alle wedstrijden, startlijsten en timing in één duidelijk overzicht.',
    monthOverview: 'Maandoverzicht',
    selectedDay: 'Geselecteerde dag',
    noDay: 'Geen dag geselecteerd',
    clickDay: 'Klik op een rode dag om details te bekijken.',
    allEvents: 'Alle events',
    open: 'Open',
    full: 'Volzet',
    cancelled: 'Afgelast',
    signup: 'Inschrijven',
    startlists: 'Startlijsten',
    timing: 'Timing',
    arena1: 'Piste 1',
    arena2: 'Piste 2',
    noEvents: 'Nog geen wedstrijden toegevoegd.',
    details: 'Details',
  },
  fr: {
    calendar: 'Calendrier',
    list: 'Liste',
    info: 'Infos',
    contact: 'Contact',
    home: 'Accueil',
    title: 'Calendrier',
    intro: 'Consultez les concours, listes de départ et horaires dans une vue claire.',
    monthOverview: 'Vue mensuelle',
    selectedDay: 'Jour sélectionné',
    noDay: 'Aucun jour sélectionné',
    clickDay: 'Cliquez sur un jour rouge pour voir les détails.',
    allEvents: 'Tous les événements',
    open: 'Ouvert',
    full: 'Complet',
    cancelled: 'Annulé',
    signup: 'S’inscrire',
    startlists: 'Listes de départ',
    timing: 'Timing',
    arena1: 'Piste 1',
    arena2: 'Piste 2',
    noEvents: 'Aucun concours ajouté.',
    details: 'Détails',
  },
  en: {
    calendar: 'Calendar',
    list: 'List',
    info: 'Info',
    contact: 'Contact',
    home: 'Home',
    title: 'Calendar',
    intro: 'View all competitions, start lists and timings in one clear overview.',
    monthOverview: 'Month overview',
    selectedDay: 'Selected day',
    noDay: 'No day selected',
    clickDay: 'Click a red day to view details.',
    allEvents: 'All events',
    open: 'Open',
    full: 'Full',
    cancelled: 'Cancelled',
    signup: 'Enter',
    startlists: 'Start lists',
    timing: 'Timing',
    arena1: 'Arena 1',
    arena2: 'Arena 2',
    noEvents: 'No competitions added yet.',
    details: 'Details',
  },
}

const monthNames = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const weekDays = {
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localeForLang(lang: Lang) {
  if (lang === 'fr') return 'fr-BE'
  if (lang === 'en') return 'en-GB'
  return 'nl-BE'
}

function formatDate(date: string, lang: Lang) {
  return new Date(date + 'T12:00:00').toLocaleDateString(localeForLang(lang), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(date: string, lang: Lang) {
  return new Date(date + 'T12:00:00').toLocaleDateString(localeForLang(lang), {
    day: '2-digit',
    month: 'short',
  })
}

function getStatusLabel(status: string | null, t: typeof translations.nl) {
  if (status === 'full') return t.full
  if (status === 'cancelled') return t.cancelled
  return t.open
}

export default function KalenderPage() {
  const [lang, setLang] = useState<Lang>('nl')

    useEffect(() => {
    const savedLang = localStorage.getItem('bomaco-lang') as Lang | null

    if (savedLang) {
        setLang(savedLang)
    }
    }, [])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<string>('')

  const t = translations[lang]

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('visible', true)
        .order('event_date', { ascending: true })

      if (!error) {
        const rows = data || []
        setEvents(rows)

        if (rows.length > 0) {
          setSelectedDate(rows[0].event_date)
          setCurrentMonth(new Date(rows[0].event_date + 'T12:00:00'))
        }
      }

      setLoading(false)
    }

    loadEvents()
  }, [])

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {}

    events.forEach((event) => {
      if (!map[event.event_date]) map[event.event_date] = []
      map[event.event_date].push(event)
    })

    return map
  }, [events])

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = lastDay.getDate()
    const cells: { date: Date | null; key: string }[] = []

    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: `empty-start-${i}` })
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      cells.push({ date, key: dateKey(date) })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `empty-end-${cells.length}` })

    return cells
  }, [currentMonth])

  function getDescription(event: EventItem) {
    if (lang === 'fr') return event.description_fr || event.description_nl || ''
    if (lang === 'en') return event.description_en || event.description_nl || ''
    return event.description_nl || ''
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <main className="sub-page calendar-page">
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
              <button key={item} type="button" onClick={() => {
                setLang(item)
                localStorage.setItem('bomaco-lang', item)
              }} className={lang === item ? 'active' : ''}>
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <a href="/" className="nav-button">
            {t.home}
          </a>
        </div>
      </nav>

      <section className="calendar-hero compact">
        <div>
          <span className="calendar-kicker">{t.allEvents}</span>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>

        <div className="view-switch">
          <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
            <List size={17} />
            {t.list}
          </button>

          <button type="button" className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>
            <CalendarDays size={17} />
            {t.calendar}
          </button>
        </div>
      </section>

      {viewMode === 'calendar' && (
        <section className="calendar-dashboard clean">
          <div className="calendar-board">
            <div className="calendar-board-top">
              <div>
                <span>{t.monthOverview}</span>
                <h2>
                  {monthNames[lang][currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
              </div>

              <div className="calendar-nav">
                <button type="button" onClick={previousMonth} aria-label="Vorige maand">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={nextMonth} aria-label="Volgende maand">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {weekDays[lang].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((cell) => {
                if (!cell.date) return <div key={cell.key} className="calendar-day empty" />

                const key = dateKey(cell.date)
                const dayEvents = eventsByDate[key] || []
                const hasEvent = dayEvents.length > 0
                const isSelected = selectedDate === key

                return (
                  <button
                    key={key}
                    type="button"
                    className={`calendar-day ${hasEvent ? 'has-event' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => hasEvent && setSelectedDate(key)}
                  >
                    <span className="day-number">{cell.date.getDate()}</span>

                    {hasEvent && (
                      <>
                        <span className="event-dot">{dayEvents.length}</span>

                        <div className="calendar-tooltip">
                          {dayEvents.map((event) => (
                            <div key={event.id} className="tooltip-event">
                              <strong>{event.title}</strong>

                              <span>
                                <Clock3 size={13} />
                                {event.start_time || formatShortDate(event.event_date, lang)}
                              </span>

                              {event.location && (
                                <span>
                                  <MapPin size={13} />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="selected-events-panel">
            <span>{t.selectedDay}</span>
            <h2>{selectedDate ? formatDate(selectedDate, lang) : t.noDay}</h2>

            {loading && <p className="panel-muted">Loading...</p>}

            {!loading && selectedEvents.length === 0 && <p className="panel-muted">{t.clickDay}</p>}

            <div className="selected-events-list">
              {selectedEvents.map((event) => (
                <EventCard key={event.id} event={event} t={t} lang={lang} getDescription={getDescription} />
              ))}
            </div>
          </aside>
        </section>
      )}

      {viewMode === 'list' && (
        <section className="all-events-section clean-list">
          <div className="list-header">
            <h2>{t.allEvents}</h2>
            <span>{events.length} {lang === 'nl' ? 'evenementen' : lang === 'fr' ? 'événements' : 'events'}</span>
          </div>
          <div className="events-list professional">
            {!loading && events.length === 0 && <div className="empty-card">{t.noEvents}</div>}

            {events.map((event) => (
              <article className="event-row compact-row" key={event.id}>
                <div className="event-date-block">
                  <strong>{formatShortDate(event.event_date, lang)}</strong>
                  <span>{event.start_time || '—'}</span>
                </div>

                <div className="event-content">
                  <div className="event-title-line">
                    <h3>{event.title}</h3>
                    <span className={`event-status ${event.status || ''}`}>{getStatusLabel(event.status, t)}</span>
                  </div>

                  <div className="event-meta">
                    <span>
                      <CalendarDays size={15} />
                      {formatDate(event.event_date, lang)}
                    </span>

                    {event.start_time && (
                      <span>
                        <Clock3 size={15} />
                        {event.start_time}
                      </span>
                    )}

                    {event.location && (
                      <span>
                        <MapPin size={15} />
                        {event.location}
                      </span>
                    )}
                  </div>

                  {getDescription(event) && <p>{getDescription(event)}</p>}

                  {(event.timing_arena_1 || event.timing_arena_2) && (
                    <details className="event-list-details">
                      <summary>{t.timing}</summary>

                      <div className="event-timing-block">
                        {event.timing_arena_1 && (
                          <div>
                            <span>{t.arena1}</span>
                            <pre>{event.timing_arena_1}</pre>
                          </div>
                        )}

                        {event.timing_arena_2 && (
                          <div>
                            <span>{t.arena2}</span>
                            <pre>{event.timing_arena_2}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>

                <div className="event-action">
                  {event.signup_url && event.status !== 'full' && event.status !== 'cancelled' && (
                    <a href={event.signup_url} target="_blank" rel="noreferrer" className="signup-link">
                      {t.signup}
                      <ArrowRight size={16} />
                    </a>
                  )}

                  {event.startlist_url && (
                    <a href={event.startlist_url} target="_blank" rel="noreferrer" className="signup-link secondary">
                      {t.startlists}
                      <ArrowRight size={16} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className="site-footer-simple">
        <span>© 2026 Bomaco · Asse</span>
        <a href="https://mswebdesign.be" target="_blank">Design by MS Webdesign</a>
      </footer>
    </main>
  )
}

function EventCard({
  event,
  t,
  lang,
  getDescription,
}: {
  event: EventItem
  t: typeof translations.nl
  lang: Lang
  getDescription: (event: EventItem) => string
}) {
  return (
    <div className="selected-event-card">
      <div className={`selected-event-status ${event.status || ''}`}>{getStatusLabel(event.status, t)}</div>

      <h3>{event.title}</h3>

      <div className="selected-event-meta">
        <span>
          <CalendarDays size={15} />
          {formatDate(event.event_date, lang)}
        </span>

        {event.start_time && (
          <span>
            <Clock3 size={15} />
            {event.start_time}
          </span>
        )}

        {event.location && (
          <span>
            <MapPin size={15} />
            {event.location}
          </span>
        )}
      </div>

      {getDescription(event) && <p>{getDescription(event)}</p>}

      {(event.timing_arena_1 || event.timing_arena_2) && (
        <details className="event-list-details">
          <summary>{t.timing}</summary>

          <div className="event-timing-block">
            {event.timing_arena_1 && (
              <div>
                <span>{t.arena1}</span>
                <pre>{event.timing_arena_1}</pre>
              </div>
            )}

            {event.timing_arena_2 && (
              <div>
                <span>{t.arena2}</span>
                <pre>{event.timing_arena_2}</pre>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="event-button-row">
        {event.signup_url && event.status !== 'full' && event.status !== 'cancelled' && (
          <a href={event.signup_url} target="_blank" rel="noreferrer" className="selected-event-button">
            {t.signup}
            <ArrowRight size={16} />
          </a>
        )}

        {event.startlist_url && (
          <a href={event.startlist_url} target="_blank" rel="noreferrer" className="selected-event-button secondary">
            {t.startlists}
            <ArrowRight size={16} />
          </a>
        )}
      </div>
    </div>
  )
}
