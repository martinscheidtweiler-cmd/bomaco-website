'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Info,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

import { supabase } from '../lib/supabaseClient'

type AdminView = 'menu' | 'calendar' | 'rules' | 'info'

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
  visible: boolean | null
}

type TimingLine = {
  time: string
  label: string
}

type SiteContent = {
  info_nl: string | null
  info_fr: string | null
  info_en: string | null
}

type Regulation = {
  id: string
  title_nl: string | null
  title_fr: string | null
  title_en: string | null
  file_url_nl: string | null
  file_url_fr: string | null
  file_url_en: string | null
  file_path_nl: string | null
  file_path_fr: string | null
  file_path_en: string | null
  visible: boolean | null
}

const emptyForm = {
  title: '',
  event_date: '',
  start_time: '',
  location: 'Bomaco-site Asse',
  description_nl: '',
  description_fr: '',
  description_en: '',
  signup_url: '',
  startlist_url: '',
  status: 'planned',
  visible: true,
}

const emptyRuleForm = {
  id: '',
  title_nl: '',
  title_fr: '',
  title_en: '',
  file_url_nl: '',
  file_url_fr: '',
  file_url_en: '',
  file_path_nl: '',
  file_path_fr: '',
  file_path_en: '',
  visible: true,
}

function createTimeOptions() {
  const options: string[] = []

  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      options.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      )
    }
  }

  return options
}

const timeOptions = createTimeOptions()

function parseTiming(value: string | null): TimingLine[] {
  if (!value) return []

  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, ...rest] = line.split(' - ')

      return {
        time: timePart || '08:00',
        label: rest.join(' - ') || '',
      }
    })
}

function stringifyTiming(lines: TimingLine[]) {
  return lines
    .filter((line) => line.time && line.label)
    .map((line) => `${line.time} - ${line.label}`)
    .join('\n')
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<AdminView>('menu')

  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [arena1, setArena1] = useState<TimingLine[]>([])
  const [arena2, setArena2] = useState<TimingLine[]>([])
  const [saving, setSaving] = useState(false)

  const [infoForm, setInfoForm] = useState({
    info_nl: '',
    info_fr: '',
    info_en: '',
  })
  const [infoSaving, setInfoSaving] = useState(false)

  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [selectedRule, setSelectedRule] = useState<Regulation | null>(null)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm)
  const [ruleFileNl, setRuleFileNl] = useState<File | null>(null)
  const [ruleFileFr, setRuleFileFr] = useState<File | null>(null)
  const [ruleFileEn, setRuleFileEn] = useState<File | null>(null)
  const [ruleUploading, setRuleUploading] = useState(false)

  const sortedArena1 = useMemo(
    () => [...arena1].sort((a, b) => a.time.localeCompare(b.time)),
    [arena1]
  )

  const sortedArena2 = useMemo(
    () => [...arena2].sort((a, b) => a.time.localeCompare(b.time)),
    [arena2]
  )

  function checkPassword(e: React.FormEvent) {
    e.preventDefault()

    if (password === 'Bomaco2026') {
      setAllowed(true)
      setError('')
    } else {
      setError('Verkeerd wachtwoord')
    }
  }

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    setEvents(data || [])
  }

  async function loadInfo() {
    const { data } = await supabase
      .from('site_content')
      .select('info_nl, info_fr, info_en')
      .eq('id', 'main')
      .single<SiteContent>()

    if (data) {
      setInfoForm({
        info_nl: data.info_nl || '',
        info_fr: data.info_fr || '',
        info_en: data.info_en || '',
      })
    }
  }

  async function loadRegulations() {
    const { data } = await supabase
      .from('regulations')
      .select('*')
      .order('created_at', { ascending: false })

    setRegulations(data || [])
  }

  useEffect(() => {
    if (allowed) {
      loadEvents()
      loadInfo()
      loadRegulations()
    }
  }, [allowed])

  function resetEditor() {
    setSelectedEvent(null)
    setForm(emptyForm)
    setArena1([])
    setArena2([])
  }

  function editEvent(event: EventItem) {
    setSelectedEvent(event)

    setForm({
      title: event.title || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      location: event.location || 'Bomaco-site Asse',
      description_nl: event.description_nl || '',
      description_fr: event.description_fr || '',
      description_en: event.description_en || '',
      signup_url: event.signup_url || '',
      startlist_url: event.startlist_url || '',
      status: event.status || 'planned',
      visible: event.visible ?? true,
    })

    setArena1(parseTiming(event.timing_arena_1))
    setArena2(parseTiming(event.timing_arena_2))
  }

  function copyEvent(event: EventItem) {
    setSelectedEvent(null)

    setForm({
      title: `${event.title || ''} kopie`,
      event_date: '',
      start_time: event.start_time || '',
      location: event.location || 'Bomaco-site Asse',
      description_nl: event.description_nl || '',
      description_fr: event.description_fr || '',
      description_en: event.description_en || '',
      signup_url: event.signup_url || '',
      startlist_url: event.startlist_url || '',
      status: event.status || 'planned',
      visible: event.visible ?? true,
    })

    setArena1(parseTiming(event.timing_arena_1))
    setArena2(parseTiming(event.timing_arena_2))
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      title: form.title,
      event_date: form.event_date,
      start_time: form.start_time || null,
      location: form.location || 'Bomaco-site Asse',
      description_nl: form.description_nl || null,
      description_fr: form.description_fr || null,
      description_en: form.description_en || null,
      signup_url: form.signup_url || null,
      startlist_url: form.startlist_url || null,
      timing_arena_1: stringifyTiming(sortedArena1) || null,
      timing_arena_2: stringifyTiming(sortedArena2) || null,
      status: form.status,
      visible: form.visible,
    }

    if (selectedEvent) {
      await supabase.from('events').update(payload).eq('id', selectedEvent.id)
    } else {
      await supabase.from('events').insert(payload)
    }

    await loadEvents()
    resetEditor()
    setSaving(false)
  }

  async function deleteEvent(id: string) {
    const confirmed = confirm('Dit evenement verwijderen?')
    if (!confirmed) return

    await supabase.from('events').delete().eq('id', id)
    await loadEvents()
    resetEditor()
  }

  function addTimingLine(arena: 1 | 2) {
    const newLine = { time: '08:00', label: '' }

    if (arena === 1) setArena1([...arena1, newLine])
    else setArena2([...arena2, newLine])
  }

  function updateTimingLine(
    arena: 1 | 2,
    index: number,
    field: keyof TimingLine,
    value: string
  ) {
    const setter = arena === 1 ? setArena1 : setArena2
    const current = arena === 1 ? arena1 : arena2

    setter(
      current.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    )
  }

  function removeTimingLine(arena: 1 | 2, index: number) {
    const setter = arena === 1 ? setArena1 : setArena2
    const current = arena === 1 ? arena1 : arena2

    setter(current.filter((_, i) => i !== index))
  }

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault()
    setInfoSaving(true)

    await supabase.from('site_content').upsert({
      id: 'main',
      info_nl: infoForm.info_nl,
      info_fr: infoForm.info_fr,
      info_en: infoForm.info_en,
      updated_at: new Date().toISOString(),
    })

    setInfoSaving(false)
  }

  async function uploadSingleRuleFile(file: File | null, lang: string) {
    if (!file) return null

    const safeName = file.name
      .toLowerCase()
      .replaceAll(' ', '-')
      .replace(/[^a-z0-9.-]/g, '')

    const filePath = `${lang}/${Date.now()}-${crypto.randomUUID()}-${safeName}`

    const { error } = await supabase.storage
      .from('regulations')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from('regulations').getPublicUrl(filePath)

    return {
      url: data.publicUrl,
      path: filePath,
    }
  }

  function resetRuleEditor() {
    setSelectedRule(null)
    setRuleForm(emptyRuleForm)
    setRuleFileNl(null)
    setRuleFileFr(null)
    setRuleFileEn(null)
  }

  function editRule(rule: Regulation) {
    setSelectedRule(rule)

    setRuleForm({
      id: rule.id,
      title_nl: rule.title_nl || '',
      title_fr: rule.title_fr || '',
      title_en: rule.title_en || '',
      file_url_nl: rule.file_url_nl || '',
      file_url_fr: rule.file_url_fr || '',
      file_url_en: rule.file_url_en || '',
      file_path_nl: rule.file_path_nl || '',
      file_path_fr: rule.file_path_fr || '',
      file_path_en: rule.file_path_en || '',
      visible: rule.visible ?? true,
    })

    setRuleFileNl(null)
    setRuleFileFr(null)
    setRuleFileEn(null)
  }

  async function saveRegulation(e: React.FormEvent) {
    e.preventDefault()

    if (!ruleForm.title_nl) {
      alert('Nederlandse titel is verplicht.')
      return
    }

    if (!selectedRule && !ruleFileNl) {
      alert('Nederlandse PDF is verplicht bij een nieuw reglement.')
      return
    }

    setRuleUploading(true)

    try {
      const nlUpload = await uploadSingleRuleFile(ruleFileNl, 'nl')
      const frUpload = await uploadSingleRuleFile(ruleFileFr, 'fr')
      const enUpload = await uploadSingleRuleFile(ruleFileEn, 'en')

      const payload = {
        title: ruleForm.title_nl,
        file_url: nlUpload?.url || ruleForm.file_url_nl || null,
        file_path: nlUpload?.path || ruleForm.file_path_nl || null,

        title_nl: ruleForm.title_nl,
        title_fr: ruleForm.title_fr || null,
        title_en: ruleForm.title_en || null,

        file_url_nl: nlUpload?.url || ruleForm.file_url_nl || null,
        file_url_fr: frUpload?.url || ruleForm.file_url_fr || null,
        file_url_en: enUpload?.url || ruleForm.file_url_en || null,

        file_path_nl: nlUpload?.path || ruleForm.file_path_nl || null,
        file_path_fr: frUpload?.path || ruleForm.file_path_fr || null,
        file_path_en: enUpload?.path || ruleForm.file_path_en || null,

        visible: ruleForm.visible,
      }

      if (selectedRule) {
        await supabase.from('regulations').update(payload).eq('id', selectedRule.id)
      } else {
        await supabase.from('regulations').insert(payload)
      }

      await loadRegulations()
      resetRuleEditor()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Opslaan mislukt.')
    }

    setRuleUploading(false)
  }

  async function toggleRuleVisible(rule: Regulation) {
    await supabase
      .from('regulations')
      .update({ visible: !(rule.visible ?? true) })
      .eq('id', rule.id)

    await loadRegulations()
  }

  async function deleteRegulation(rule: Regulation) {
    const confirmed = confirm('Dit reglement verwijderen?')
    if (!confirmed) return

    const paths = [
      rule.file_path_nl,
      rule.file_path_fr,
      rule.file_path_en,
    ].filter(Boolean) as string[]

    if (paths.length > 0) {
      await supabase.storage.from('regulations').remove(paths)
    }

    await supabase.from('regulations').delete().eq('id', rule.id)
    await loadRegulations()
    resetRuleEditor()
  }

  if (!allowed) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={checkPassword}>
          <span>Bomaco Admin</span>
          <h1>Beveiligde toegang</h1>

          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p>{error}</p>}

          <button type="submit">Inloggen</button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <span>Admin</span>
            <h1>Beheer Bomaco</h1>
          </div>

          <a href="/">Terug naar website</a>
        </div>

        {view === 'menu' && (
          <div className="admin-menu-grid">
            <button onClick={() => setView('calendar')}>
              <CalendarDays size={30} />
              <strong>Kalender aanpassen</strong>
              <span>Events, status, startlijsten en timing beheren</span>
            </button>

            <button onClick={() => setView('rules')}>
              <FileText size={30} />
              <strong>Reglement toevoegen</strong>
              <span>PDF-reglementen uploaden, editen en beheren</span>
            </button>

            <button onClick={() => setView('info')}>
              <Info size={30} />
              <strong>Info bewerken</strong>
              <span>Tekst NL, FR en EN aanpassen</span>
            </button>
          </div>
        )}

        {view === 'calendar' && (
          <>
            <div className="admin-subheader">
              <button onClick={() => setView('menu')}>← Terug</button>
              <h2>Kalender aanpassen</h2>
              <button onClick={resetEditor}>
                <Plus size={17} />
                Nieuw event
              </button>
            </div>

            <div className="admin-calendar-layout">
              <div className="admin-events-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`admin-event-card ${
                      selectedEvent?.id === event.id ? 'active' : ''
                    }`}
                  >
                    <div>
                      <strong>{event.title}</strong>
                      <span>
                        {event.event_date} — {event.start_time || 'geen uur'}
                      </span>
                      <em>{event.status}</em>
                    </div>

                    <div className="admin-event-actions">
                      <button type="button" onClick={() => editEvent(event)}>
                        <Pencil size={16} />
                      </button>

                      <button type="button" onClick={() => copyEvent(event)}>
                        <Copy size={16} />
                      </button>

                      <button type="button" onClick={() => deleteEvent(event.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form className="admin-form admin-editor-form" onSubmit={saveEvent}>
                <h3>{selectedEvent ? 'Event bewerken' : 'Nieuw event toevoegen'}</h3>

                <label>
                  Titel
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Winter Jumping"
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Datum
                    <input
                      required
                      type="date"
                      value={form.event_date}
                      onChange={(e) =>
                        setForm({ ...form, event_date: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Startuur
                    <select
                      value={form.start_time}
                      onChange={(e) =>
                        setForm({ ...form, start_time: e.target.value })
                      }
                    >
                      <option value="">Geen startuur</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Locatie
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Inschrijflink
                    <input
                      value={form.signup_url}
                      onChange={(e) =>
                        setForm({ ...form, signup_url: e.target.value })
                      }
                      placeholder="https://entry.equipe.com/..."
                    />
                  </label>

                  <label>
                    Startlijsten link
                    <input
                      value={form.startlist_url}
                      onChange={(e) =>
                        setForm({ ...form, startlist_url: e.target.value })
                      }
                      placeholder="https://online.equipe.com/..."
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="planned">Open / gepland</option>
                    <option value="full">Volzet</option>
                    <option value="cancelled">Afgelast</option>
                    <option value="past">Afgelopen</option>
                  </select>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={(e) =>
                      setForm({ ...form, visible: e.target.checked })
                    }
                  />
                  Zichtbaar op website
                </label>

                <label>
                  Omschrijving NL
                  <textarea
                    value={form.description_nl}
                    onChange={(e) =>
                      setForm({ ...form, description_nl: e.target.value })
                    }
                  />
                </label>

                <label>
                  Omschrijving FR
                  <textarea
                    value={form.description_fr}
                    onChange={(e) =>
                      setForm({ ...form, description_fr: e.target.value })
                    }
                  />
                </label>

                <label>
                  Omschrijving EN
                  <textarea
                    value={form.description_en}
                    onChange={(e) =>
                      setForm({ ...form, description_en: e.target.value })
                    }
                  />
                </label>

                <div className="timing-editor-grid">
                  <div className="timing-editor-card">
                    <div className="timing-editor-top">
                      <strong>Piste 1</strong>
                      <button type="button" onClick={() => addTimingLine(1)}>
                        <Plus size={16} />
                        Proef toevoegen
                      </button>
                    </div>

                    {arena1.length === 0 && (
                      <p className="timing-empty">Nog geen timing toegevoegd.</p>
                    )}

                    {arena1.map((line, index) => (
                      <div className="timing-row" key={`a1-${index}`}>
                        <select
                          value={line.time}
                          onChange={(e) =>
                            updateTimingLine(1, index, 'time', e.target.value)
                          }
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>

                        <input
                          value={line.label}
                          onChange={(e) =>
                            updateTimingLine(1, index, 'label', e.target.value)
                          }
                          placeholder="Bijv. 1.10m / Clear Round"
                        />

                        <button
                          type="button"
                          onClick={() => removeTimingLine(1, index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="timing-editor-card">
                    <div className="timing-editor-top">
                      <strong>Piste 2</strong>
                      <button type="button" onClick={() => addTimingLine(2)}>
                        <Plus size={16} />
                        Proef toevoegen
                      </button>
                    </div>

                    {arena2.length === 0 && (
                      <p className="timing-empty">Nog geen timing toegevoegd.</p>
                    )}

                    {arena2.map((line, index) => (
                      <div className="timing-row" key={`a2-${index}`}>
                        <select
                          value={line.time}
                          onChange={(e) =>
                            updateTimingLine(2, index, 'time', e.target.value)
                          }
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>

                        <input
                          value={line.label}
                          onChange={(e) =>
                            updateTimingLine(2, index, 'label', e.target.value)
                          }
                          placeholder="Bijv. 1.20m / Pony’s"
                        />

                        <button
                          type="button"
                          onClick={() => removeTimingLine(2, index)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving}>
                  {saving
                    ? 'Opslaan...'
                    : selectedEvent
                      ? 'Wijzigingen opslaan'
                      : 'Event toevoegen'}
                </button>
              </form>
            </div>
          </>
        )}

        {view === 'rules' && (
          <div className="admin-module-card">
            <div className="admin-subheader">
              <button onClick={() => setView('menu')}>← Terug</button>
              <h2>Reglementen</h2>
              <button onClick={resetRuleEditor}>
                <Plus size={17} />
                Nieuw reglement
              </button>
            </div>

            <form className="admin-form" onSubmit={saveRegulation}>
              <h3>{selectedRule ? 'Reglement bewerken' : 'Nieuw reglement'}</h3>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={ruleForm.visible}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, visible: e.target.checked })
                  }
                />
                Zichtbaar op website
              </label>

              <div className="form-grid">
                <label>
                  Titel NL
                  <input
                    value={ruleForm.title_nl}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, title_nl: e.target.value })
                    }
                    placeholder="Bijv. Algemeen reglement"
                  />
                </label>

                <label>
                  PDF NL {ruleForm.file_url_nl && '(bestaand bestand blijft behouden)'}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRuleFileNl(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Titel FR
                  <input
                    value={ruleForm.title_fr}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, title_fr: e.target.value })
                    }
                    placeholder="Bijv. Règlement général"
                  />
                </label>

                <label>
                  PDF FR {ruleForm.file_url_fr && '(bestaand bestand blijft behouden)'}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRuleFileFr(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Titel EN
                  <input
                    value={ruleForm.title_en}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, title_en: e.target.value })
                    }
                    placeholder="Bijv. General rules"
                  />
                </label>

                <label>
                  PDF EN {ruleForm.file_url_en && '(bestaand bestand blijft behouden)'}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRuleFileEn(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button type="submit" disabled={ruleUploading}>
                <Upload size={17} />
                {ruleUploading
                  ? 'Opslaan...'
                  : selectedRule
                    ? 'Reglement opslaan'
                    : 'Reglement toevoegen'}
              </button>
            </form>

            <div className="admin-rules-list">
              {regulations.map((rule) => (
                <div className="admin-rule-item" key={rule.id}>
                  <a href={rule.file_url_nl || '#'} target="_blank">
                    <FileText size={18} />

                    <div className="admin-rule-titles">
                      <strong>{rule.title_nl || 'Geen NL titel'}</strong>
                      {rule.title_fr && <span>FR: {rule.title_fr}</span>}
                      {rule.title_en && <span>EN: {rule.title_en}</span>}
                      <span>{rule.visible === false ? 'Verborgen' : 'Zichtbaar'}</span>
                    </div>
                  </a>

                  <div className="admin-event-actions">
                    <button type="button" onClick={() => editRule(rule)}>
                      <Pencil size={16} />
                    </button>

                    <button type="button" onClick={() => toggleRuleVisible(rule)}>
                      {rule.visible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button type="button" onClick={() => deleteRegulation(rule)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'info' && (
          <div className="admin-module-card">
            <div className="admin-subheader">
              <button onClick={() => setView('menu')}>← Terug</button>
              <h2>Info bewerken</h2>
            </div>

            <form className="admin-form" onSubmit={saveInfo}>
              <label>
                Tekst NL
                <textarea
                  value={infoForm.info_nl}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, info_nl: e.target.value })
                  }
                />
              </label>

              <label>
                Tekst FR
                <textarea
                  value={infoForm.info_fr}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, info_fr: e.target.value })
                  }
                />
              </label>

              <label>
                Tekst EN
                <textarea
                  value={infoForm.info_en}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, info_en: e.target.value })
                  }
                />
              </label>

              <button type="submit" disabled={infoSaving}>
                {infoSaving ? 'Opslaan...' : 'Info opslaan'}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  )
}