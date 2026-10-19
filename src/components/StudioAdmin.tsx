import { useEffect, useState } from 'react'
import { locationService, type Studio, type StudioInstructor } from '../lib/locations'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ApiError } from '../lib/apiClient'
import { Loader2 } from 'lucide-react'

export function StudioAdmin() {
  const [locations, setLocations] = useState<Studio[]>([])
  const [instructors, setInstructors] = useState<StudioInstructor[]>([])
  const [drafts, setDrafts] = useState<Record<string, { name: string; address: string }>>({})
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = async () => {
    const result = await locationService.adminList()
    setLocations(result.locations || [])
    setInstructors(result.instructors || [])
    setDrafts(Object.fromEntries((result.locations || []).map((location) => [
      location.id,
      { name: location.name, address: location.address || '' },
    ])))
  }

  useEffect(() => {
    let cancelled = false
    locationService.adminList()
      .then((result) => {
        if (cancelled) return
        setLocations(result.locations || [])
        setInstructors(result.instructors || [])
        setDrafts(Object.fromEntries((result.locations || []).map((location) => [
          location.id,
          { name: location.name, address: location.address || '' },
        ])))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load studios.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const run = async (id: string, action: () => Promise<void>) => {
    setSaving(id)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the studio.')
    } finally {
      setSaving(null)
    }
  }

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter a studio name.')
      return
    }
    await run('new', async () => {
      await locationService.create({ name: trimmed, address: address.trim() })
      setName('')
      setAddress('')
    })
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add a studio, then open it to choose which instructors can host there.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          aria-label="Studio name"
          placeholder="Studio name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          aria-label="Studio address"
          placeholder="Address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <Button type="button" className="w-full sm:w-auto" disabled={saving === 'new'} onClick={create}>
          Add studio
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading studios...
        </div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No studios yet.</p>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => {
            const draft = drafts[location.id] || { name: location.name, address: location.address || '' }
            const busy = saving === location.id
            const instructorIds = location.instructor_ids || []
            const open = openId === location.id
            const status = location.removed_at
              ? 'Removed'
              : location.class_count
                ? `${location.class_count} class${location.class_count === 1 ? '' : 'es'}`
                : 'No classes'
            return (
              <div key={location.id} className="border rounded-lg bg-card">
                <button
                  type="button"
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => setOpenId(open ? null : location.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{location.name}</span>
                    <span className="block text-muted-foreground">
                      {location.address ? `${location.address} · ` : ''}
                      {status} · {instructorIds.length} instructor{instructorIds.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{open ? 'Hide' : 'Edit'}</span>
                </button>
                {open && (
              <div className="space-y-3 px-3 pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label={`${location.name} name`}
                    value={draft.name}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [location.id]: { ...draft, name: event.target.value },
                    }))}
                  />
                  <Input
                    aria-label={`${location.name} address`}
                    placeholder="Address"
                    value={draft.address}
                    onChange={(event) => setDrafts((current) => ({
                      ...current,
                      [location.id]: { ...draft, address: event.target.value },
                    }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => run(location.id, () => locationService.update(location.id, {
                      name: draft.name,
                      address: draft.address,
                    }))}
                  >
                    Save
                  </Button>
                </div>
                <div>
                  {location.removed_at ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => run(location.id, () => locationService.update(location.id, { removed: false }))}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={busy || (location.class_count || 0) > 0}
                      onClick={() => {
                        if (!confirm(`Remove ${location.name}? Instructors will no longer add classes here.`)) return
                        run(location.id, () => locationService.update(location.id, { removed: true }))
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Instructors</Label>
                  <p className="text-sm text-muted-foreground">Check everyone who can host classes here.</p>
                  {instructors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No instructors yet.</p>
                  ) : (
                    instructors.map((instructor) => {
                      const checked = instructorIds.includes(instructor.user_id)
                      return (
                        <label key={instructor.user_id} className="flex items-center gap-2 py-1 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() => {
                              const next = checked
                                ? instructorIds.filter((id) => id !== instructor.user_id)
                                : [...instructorIds, instructor.user_id]
                              run(location.id, () => locationService.update(location.id, { instructor_ids: next }))
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{instructor.name || instructor.email}</span>
                            {instructor.name && (
                              <span className="block text-muted-foreground">{instructor.email}</span>
                            )}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
